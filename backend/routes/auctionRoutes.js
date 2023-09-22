import express from "express";
import Auction from "../models/auctionModel.js";
import { io } from "../index.js";
import { isAdmin, isAuth, isSeller } from "../utils.js";
import expressAsyncHandler from "express-async-handler";
import User from "../models/userModel.js";

const PAGE_SIZE = 8;

const auctionRouter = express.Router();

// Create new auction
auctionRouter.post("/", isAuth, isSeller, async (req, res) => {
  try {
    let {
      title,
      description,
      artist,
      subject_class,
      year_of_production,
      startingBid,
      dimension,
      imageUrl,
      endDate,
      category_title,
      category_info,
    } = req.body;
    const seller = req.user._id;
    const category = {
      title: category_title,
      [category_title]: category_info,
    };
    // const lot_number = (await Auction.countDocuments()) + 1;
    const currentBid = startingBid;
    const newAuction = new Auction({
      // lot_number,
      title,
      description,
      artist,
      subject_class,
      year_of_production,
      startingBid,
      currentBid,
      dimension,
      imageUrl,
      endDate,
      category,
      seller,
    });
    const createdAuction = await newAuction.save();
    res
      .status(201)
      .json({ createdAuction, message: "Auction Created Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// update auction
auctionRouter.put("/:id", isAuth, async (req, res) => {
  try {
    let {
      title,
      description,
      artist,
      subject_class,
      year_of_production,
      dimension,
      imageUrl,
      endDate,
      category_title,
      category_info,
    } = req.body;
    const category = {
      title: category_title,
      [category_title]: category_info,
    };
    const newAuction = await Auction.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          title,
          description,
          artist,
          subject_class,
          year_of_production,
          dimension,
          imageUrl,
          endDate,
          category,
        },
      },
      {
        new: true,
      }
    );
    res
      .status(201)
      .json({ newAuction, message: "Auction Updated Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Get all auctions
auctionRouter.get("/", async (req, res) => {
  try {
    const auctions = await Auction.find({});
    res.json(auctions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// get sellers auction
auctionRouter.get(
  "/my-auctions",
  isAuth,
  isSeller,
  expressAsyncHandler(async (req, res) => {
    const { query } = req;
    const page = query.page || 1;
    const pageSize = query.pageSize || PAGE_SIZE;
    const seller = req.user._id;
    console.log(req.user);
    const auctions = await Auction.find({ seller })
      .skip(pageSize * (page - 1))
      .limit(pageSize);
    const countAuction = await Auction.countDocuments();
    res.send({
      auctions,
      countAuction,
      page,
      pages: Math.ceil(countAuction / pageSize),
    });
  })
);

// get paginated auctions for admin
auctionRouter.get(
  "/admin",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { query } = req;
    const page = query.page || 1;
    const pageSize = query.pageSize || PAGE_SIZE;
    const auctions = await Auction.find()
      .skip(pageSize * (page - 1))
      .limit(pageSize);
    const countAuction = await Auction.countDocuments();
    res.send({
      auctions,
      countAuction,
      page,
      pages: Math.ceil(countAuction / pageSize),
    });
  })
);

// get search results
auctionRouter.get(
  "/search",
  expressAsyncHandler(async (req, res) => {
    const { query } = req;
    const pageSize = query.pageSize || PAGE_SIZE;
    const page = query.page || 1;
    const category = query.category || "";
    const price = query.price || "";
    const order = query.order || "";
    const searchQuery = query.query || "";
    const queryFilter =
      searchQuery && searchQuery !== "all"
        ? {
            title: {
              $regex: searchQuery,
              $options: "i", // case insensitive
            },
          }
        : {};

    const categoryFilter =
      category && category != "all" ? { category: { title: category } } : {};

    const priceFilter =
      price && price != "all"
        ? {
            currentBid: {
              $gte: Number(price.split("-")[0]),
              $lte: Number(price.split("-")[1]),
            },
          }
        : {};
    const sortOrder =
      order === "lowest"
        ? { currentBid: 1 }
        : order === "highest"
        ? { currentBid: -1 }
        : order === "newest"
        ? { createdAt: -1 }
        : { _id: -1 };
    const auctions = await Auction.find({
      ...queryFilter,
      ...categoryFilter,
      ...priceFilter,
    })
      .sort(sortOrder)
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    const countAuctions = await Auction.countDocuments({
      ...queryFilter,
      ...categoryFilter,
      ...priceFilter,
    });

    res.send({
      auctions,
      countAuctions,
      page,
      pages: Math.ceil(countAuctions / pageSize),
    });
  })
);

// Get a specific auction
auctionRouter.get("/:id", async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }
    res.json(auction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Place a bid on an auction
auctionRouter.post("/:id/bids", isAuth, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }
    const { bidAmount, bidder } = req.body;
    if (bidAmount <= auction.currentBid) {
      return res
        .status(400)
        .json({ message: "Bid amount must be greater than current bid" });
    }
    if (auction.endDate === 0) {
      return res.status(400).json({ message: "Auction has ended" });
    }
    auction.bids.push({ bidder: bidder, bidAmount: bidAmount });
    auction.currentBid = bidAmount;
    auction.bids.bidder = bidder;

    const updatedAuction = await auction.save();
    io.emit("bid", updatedAuction); // emit the 'bid' event with the updated auction
    res.json(updatedAuction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// DELETE auction by ID
auctionRouter.delete("/:id", isAuth, async (req, res) => {
  try {
    const auction = await Auction.findByIdAndDelete(req.params.id);
    if (!auction) {
      return res.status(404).send({ error: "Auction not found" });
    }
    res.send({ auction, message: "Auction Deleted" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// get my bids
auctionRouter.get(
  "/my-bids",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { query } = req;
    const page = query.page || 1;
    const pageSize = query.pageSize || PAGE_SIZE;
    const bidder = req.user._id;
    const bids = await Auction.find({ bids: { bidder } })
      .bids.skip(pageSize * (page - 1))
      .limit(pageSize);

    console.log(bids);
    res.send({
      bids,
      countAuction,
      page,
      pages: Math.ceil(countBids / pageSize),
    });
  })
);
export default auctionRouter;
