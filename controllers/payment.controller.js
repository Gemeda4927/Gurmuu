const axios = require('axios');
const Event = require('../models/Event');

// Chapa configuration
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST-VOL3syHE4dBYylmdXl3GrrEmJliZiJ6r';
const CHAPA_PUBLIC_KEY = process.env.CHAPA_PUBLIC_KEY || 'CHAPUBK_TEST-AJfZrcKtpTxsZy8zpx9XsbqNK3naNVKr';
const CHAPA_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.chapa.co/v1' 
  : 'https://api.chapa.co/v1';

/**
 * @desc   Initialize donation payment
 * @route  POST /api/v1/events/:id/donate
 */
exports.initializeDonation = async (req, res) => {
  try {
    const { amount, currency, donorName, donorEmail, donorPhone, message, isAnonymous } = req.body;
    
    // Validate required fields
    if (!amount || !donorEmail) {
      return res.status(400).json({
        success: false,
        message: 'Amount and donor email are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event || !event.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (!event.monetization?.allowDonation) {
      return res.status(400).json({
        success: false,
        message: 'Donations are not enabled for this event'
      });
    }

    // Generate unique reference
    const txRef = `DON-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Prepare Chapa request
    const chapaRequest = {
      amount: amount.toString(),
      currency: currency || 'ETB',
      email: donorEmail,
      first_name: donorName?.split(' ')[0] || 'Anonymous',
      last_name: donorName?.split(' ').slice(1).join(' ') || 'Donor',
      phone_number: donorPhone || '',
      tx_ref: txRef,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/donation/callback`,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}/donation-success`,
      customization: {
        title: `Donation to ${event.title}`,
        description: `Support ${event.title} event`
      },
      meta: {
        eventId: event._id.toString(),
        eventTitle: event.title,
        donorName: isAnonymous ? 'Anonymous' : donorName,
        donorEmail,
        isAnonymous: isAnonymous || false,
        message: message || ''
      }
    };

    // Call Chapa API
    const response = await axios.post(
      `${CHAPA_BASE_URL}/transaction/initialize`,
      chapaRequest,
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout
      }
    );

    if (response.data.status === 'success') {
      // Save donation record (pending)
      const donation = {
        amount,
        currency: currency || 'ETB',
        donorName: isAnonymous ? 'Anonymous' : donorName,
        donorEmail,
        donorPhone: donorPhone || '',
        paymentReference: txRef,
        chapaTransactionId: response.data.data.tx_ref,
        status: 'pending',
        message: message || '',
        isAnonymous: isAnonymous || false,
        metadata: chapaRequest.meta
      };

      event.donations.push(donation);
      await event.save();

      res.status(200).json({
        success: true,
        message: 'Payment initialized successfully',
        data: {
          checkoutUrl: response.data.data.checkout_url,
          paymentReference: txRef,
          publicKey: CHAPA_PUBLIC_KEY
        }
      });
    } else {
      throw new Error(response.data.message || 'Failed to initialize payment');
    }
  } catch (error) {
    console.error('Donation initialization error:', error.response?.data || error.message);
    
    // Handle specific errors
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        success: false,
        message: 'Payment gateway timeout'
      });
    }
    
    if (error.response?.status === 400) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment request',
        error: error.response.data?.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to initialize donation',
      error: error.response?.data?.message || error.message
    });
  }
};

/**
 * @desc   Verify donation payment (Webhook/callback)
 * @route  POST /api/v1/payments/verify
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { tx_ref } = req.body;

    if (!tx_ref) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    // Verify with Chapa
    const verifyResponse = await axios.get(
      `${CHAPA_BASE_URL}/transaction/verify/${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`
        }
      }
    );

    const transaction = verifyResponse.data.data;

    // Find event by donation reference
    const event = await Event.findOne({ 'donations.paymentReference': tx_ref });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found for this transaction'
      });
    }

    // Find and update the specific donation
    const donationIndex = event.donations.findIndex(d => d.paymentReference === tx_ref);
    if (donationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Donation record not found'
      });
    }

    const donation = event.donations[donationIndex];
    const newStatus = transaction.status === 'success' ? 'success' : 'failed';
    
    // Only process if status changed
    if (donation.status !== newStatus) {
      donation.status = newStatus;
      donation.verifiedAt = new Date();
      donation.chapaTransactionId = transaction.id;
      donation.paymentMethod = transaction.payment_method;
      
      if (newStatus === 'success') {
        // Update totals
        event.totalDonations += donation.amount;
        event.totalDonors += 1;
        
        // Add to recent donations
        event.recentDonations.unshift({
          donorName: donation.donorName,
          amount: donation.amount,
          time: new Date()
        });
        
        // Keep only last 10 recent donations
        if (event.recentDonations.length > 10) {
          event.recentDonations = event.recentDonations.slice(0, 10);
        }
        
        // Update impact funds raised
        if (!event.impact.fundsRaised) event.impact.fundsRaised = 0;
        event.impact.fundsRaised += donation.amount;
      }
      
      await event.save();
    }

    res.status(200).json({
      success: true,
      message: `Payment ${newStatus}`,
      data: {
        status: donation.status,
        transactionId: donation.chapaTransactionId,
        amount: donation.amount,
        donorName: donation.donorName,
        eventTitle: event.title
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.response?.data?.message || error.message
    });
  }
};

/**
 * @desc   Get event donations
 * @route  GET /api/v1/events/:id/donations
 */
exports.getEventDonations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .select('donations totalDonations totalDonors monetization recentDonations title');
    
    if (!event || !event.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const { limit = 20, page = 1, status } = req.query;
    const skip = (page - 1) * limit;

    // Filter donations
    let filteredDonations = event.donations;
    
    if (status) {
      filteredDonations = filteredDonations.filter(d => d.status === status);
    }

    // Sort by date (newest first)
    filteredDonations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate
    const paginatedDonations = filteredDonations.slice(skip, skip + parseInt(limit));

    // Calculate statistics
    const successfulDonations = event.donations.filter(d => d.status === 'success');
    const totalRaised = successfulDonations.reduce((sum, d) => sum + d.amount, 0);
    const avgDonation = successfulDonations.length > 0 
      ? totalRaised / successfulDonations.length 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        donations: paginatedDonations,
        pagination: {
          total: filteredDonations.length,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(filteredDonations.length / limit)
        },
        summary: {
          eventTitle: event.title,
          totalDonations: event.totalDonations,
          totalDonors: event.totalDonors,
          donationGoal: event.monetization?.donationGoal || 0,
          progressPercentage: event.monetization?.donationGoal 
            ? (event.totalDonations / event.monetization.donationGoal) * 100 
            : 0,
          totalRaised,
          averageDonation: avgDonation,
          recentDonations: event.recentDonations || []
        }
      }
    });
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donations',
      error: error.message
    });
  }
};

module.exports = exports;