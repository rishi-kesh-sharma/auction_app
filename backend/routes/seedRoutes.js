import express from "express";
import User from "../models/userModel.js";

const seedRouter = express.Router();


// seeding the data in database
seedRouter.get("/", async (req, res) => {
  // removing all previous records in Auctions model
  await Auction.deleteMany({});
  const createdAuctions = await Auction.insertMany(data.auction);

  await User.deleteMany({});
  const createdUsers = await User.insertMany(data.users);
  res.send({ createdAuctions, createdUsers }); // sending new Auctions to the frontend
});

export default seedRouter;
