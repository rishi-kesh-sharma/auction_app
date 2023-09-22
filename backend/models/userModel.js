// User database from DB
import mongoose from "mongoose";

// user schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, required: true, default: false },
    isSeller: { type: Boolean, required: true, default: false },
    seller: {
      name: { type: String, required: false },
      logo: { type: String, required: false },
      description: { type: String, required: false },
      rating: { type: Number, default: 0, required: true },
      reviews: { type: Number, default: 0, required: true },
    },
  },
  {
    timestamps: true, // for logging timestamp for create and update of records
  }
);

// creating model for schema
const User = mongoose.model("User", userSchema);

export default User;
