import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  name: { type: String },
  email: { type: String, unique: true, sparse: true },
  avatar: { type: String },
  phone: { type: String, unique: true, sparse: true },
  password: String,
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  facebookId: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ["super_admin", "admin", "guest"], required: true },
  eleid: { type: String, unique: true, sparse: true }, // Thêm trường eleid vào đây
});

const User = mongoose.model('User', userSchema);
export default User;
