const User = require('../models/User');
const { ROLES, PERMISSIONS } = require('../constants/permissions.constants');
const { body, validationResult } = require('express-validator');

// Validation
const validateGrantPermission = [
  body('permission').notEmpty().withMessage('Permission is required').isIn(Object.values(PERMISSIONS)).withMessage('Invalid permission'),
  body('reason').optional().trim()
];

const validateChangeRole = [
  body('role').notEmpty().withMessage('Role is required').isIn(Object.values(ROLES)).withMessage('Invalid role'),
  body('reason').optional().trim()
];

// Grant permission
const grantPermission = [
  ...validateGrantPermission,
  async (req,res,next)=>{
    try{
      const errors = validationResult(req);
      if(!errors.isEmpty()) return res.status(400).json({success:false, errors:errors.array()});
      const { permission } = req.body;
      const targetUser = await User.findById(req.params.id);
      if(!targetUser) return res.status(404).json({success:false,message:'User not found'});

      if(targetUser.role===ROLES.SUPERADMIN && req.user.role!==ROLES.SUPERADMIN)
        return res.status(403).json({success:false,message:'Cannot modify superadmin permissions'});
      if(targetUser._id.equals(req.user._id)) 
        return res.status(400).json({success:false,message:'Cannot modify your own permissions'});

      targetUser.grantPermission(permission);
      await targetUser.save();
      res.status(200).json({success:true,message:`Permission '${permission}' granted`,user:targetUser});
    }catch(err){next(err);}
  }
];

// Revoke permission
const revokePermission = [
  ...validateGrantPermission,
  async (req,res,next)=>{
    try{
      const errors = validationResult(req);
      if(!errors.isEmpty()) return res.status(400).json({success:false, errors:errors.array()});
      const { permission } = req.body;
      const targetUser = await User.findById(req.params.id);
      if(!targetUser) return res.status(404).json({success:false,message:'User not found'});

      if(targetUser.role===ROLES.SUPERADMIN && req.user.role!==ROLES.SUPERADMIN)
        return res.status(403).json({success:false,message:'Cannot modify superadmin permissions'});
      if(targetUser._id.equals(req.user._id)) 
        return res.status(400).json({success:false,message:'Cannot modify your own permissions'});

      targetUser.revokePermission(permission);
      await targetUser.save();
      res.status(200).json({success:true,message:`Permission '${permission}' revoked`,user:targetUser});
    }catch(err){next(err);}
  }
];

// Reset permissions
const resetPermissions = [
  body('reason').optional().trim(),
  async (req,res,next)=>{
    try{
      const targetUser = await User.findById(req.params.id);
      if(!targetUser) return res.status(404).json({success:false,message:'User not found'});
      if(targetUser.role===ROLES.SUPERADMIN && req.user.role!==ROLES.SUPERADMIN)
        return res.status(403).json({success:false,message:'Cannot reset superadmin permissions'});
      if(targetUser._id.equals(req.user._id)) return res.status(400).json({success:false,message:'Cannot reset your own permissions'});

      targetUser.customPermissions={granted:[],revoked:[]};
      await targetUser.save();
      res.status(200).json({success:true,message:`Permissions reset`,user:targetUser});
    }catch(err){next(err);}
  }
];

// Change role
const changeRole = [
  ...validateChangeRole,
  async (req,res,next)=>{
    try{
      const errors = validationResult(req);
      if(!errors.isEmpty()) return res.status(400).json({success:false, errors:errors.array()});
      const { role } = req.body;
      const targetUser = await User.findById(req.params.id);
      if(!targetUser) return res.status(404).json({success:false,message:'User not found'});

      if(targetUser._id.equals(req.user._id)) return res.status(400).json({success:false,message:'Cannot change your own role'});
      if((role===ROLES.SUPERADMIN || targetUser.role===ROLES.SUPERADMIN) && req.user.role!==ROLES.SUPERADMIN)
        return res.status(403).json({success:false,message:'Only superadmin can manage superadmin roles'});

      const oldRole = targetUser.role;
      targetUser.role = role;
      if(oldRole===ROLES.SUPERADMIN || role===ROLES.SUPERADMIN) targetUser.customPermissions={granted:[],revoked:[]};
      targetUser.updatedBy=req.user._id;
      await targetUser.save();
      res.status(200).json({success:true,message:`Role changed from ${oldRole} to ${role}`,oldRole,newRole:role,user:targetUser});
    }catch(err){next(err);}
  }
];

// Queries
const getAllPermissions = async (req,res,next)=>{
  try{
    res.status(200).json({success:true,permissions:PERMISSIONS,roles:ROLES,rolePermissions:{
      [ROLES.USER]:'Default view content',
      [ROLES.ADMIN]:'Default admin permissions',
      [ROLES.SUPERADMIN]:'All permissions'
    }});
  }catch(err){next(err);}
};

const checkPermission = async (req,res,next)=>{
  try{
    const targetUser = await User.findById(req.params.userId);
    if(!targetUser) return res.status(404).json({success:false,message:'User not found'});
    const hasPermission = targetUser.hasPermission(req.params.permission);
    res.status(200).json({success:true,hasPermission,permission:req.params.permission,user:targetUser});
  }catch(err){next(err);}
};

const getUserPermissions = async (req,res,next)=>{
  try{
    const targetUser = await User.findById(req.params.id);
    if(!targetUser) return res.status(404).json({success:false,message:'User not found'});
    res.status(200).json({
      success:true,
      user:{_id:targetUser._id,name:targetUser.name,email:targetUser.email,role:targetUser.role},
      effectivePermissions:targetUser.getPermissions(),
      customPermissions:targetUser.customPermissions,
      isSuperadmin:targetUser.role===ROLES.SUPERADMIN
    });
  }catch(err){next(err);}
};

module.exports = {
  grantPermission,
  revokePermission,
  resetPermissions,
  changeRole,
  getAllPermissions,
  checkPermission,
  getUserPermissions
};
