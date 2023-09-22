import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";

// seed router
import seedRouter from "./routes/seedRoutes.js";

// user router
import userRouter from "./routes/userRoutes.js";

// upload router
import uploadRouter from "./routes/uploadRoutes.js";

// auction router
import auctionRouter from "./routes/auctionRoutes.js";

// general router
import generalRouter from "./routes/generalRoutes.js";

// auction model
import Auction from "./models/auctionModel.js";

// dotenv configuration
dotenv.config();

// creating app
const app = express();

// using json parser middleware
app.use(express.json());

// using url encoding middleware
app.use(express.urlencoded({ extended: true }));

// using cors middleware
app.use(cors());

// using seeder api
app.use("/api/seed", seedRouter);

// database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("[DB] Connection Success");
  })
  .catch((err) => {
    console.log(err.message);
  });

// using image file uploader router
app.use("/api/upload", uploadRouter);

// using user router
app.use("/api/users", userRouter);

// using auction router
app.use("/api/auctions", auctionRouter);

// using general router
app.use("/api/general", generalRouter);

// using error middleware
app.use((err, req, res, next) => {
  res.status(500).send({ message: err.message });
});

// port number
const port = process.env.PORT || 5000;

// creating server
const server = http.createServer(app);

// socket connection
const io = new Server(server, {
  cors: {
    origin: [process.env.API_URI, "http://localhost:3000"],
  },
});

// on connection event
io.on("connection", (socket) => {
  // on auction join event
  socket.on("joinAuction", async (auctionId) => {
    try {
      // finding the auction by id
      const auction = await Auction.findById(auctionId);

      if (!auction) {
        console.log(`[Socket] Auction not found ${auctionId}`);
        socket.emit("auctionError", { message: "Auction not found" });
      } else {
        console.log(`[Socket] Joining auction ${auctionId}`);
        socket.join(auctionId);
        socket.emit("auctionData", auction);
      }
    } catch (error) {
      console.log(
        `[Socket] Error joining auction ${auctionId}: ${error.message}`
      );

      // emitting auction error event
      socket.emit("auctionError", { message: "Server Error" });
    }
  });

  // on firing  leaving auction event
  socket.on("leaveAuction", (auctionId) => {
    console.log(`[Socket] Leaving auction ${auctionId}`);
    socket.leave(auctionId);
  });

  // on bid placement event firing
  socket.on("placeBid", async ({ auctionId, bidder, bidAmount }) => {
    try {
      const auction = await Auction.findById(auctionId);

      if (!auction) {
        console.log(`[Socket] Auction not found ${auctionId}`);
        socket.emit("auctionError", { message: "Auction not found" });
        return;
      }

      if (bidAmount <= auction.currentBid) {
        console.log(
          `[SocketIO] Bid must be greater than current bid: ${bidAmount}`
        );
        return;
      }

      if (auction.endDate === 0) {
        console.log("auction ended", auctionId);
        console.log(`[SocketIO] Auction has ended: ${auctionId}`);
        return;
      }

      auction.bids.push({ bidder: "Anonymous", bidAmount: bidAmount });
      auction.currentBid = bidAmount;

      const updatedAuction = await auction.save();

      // emitting bid updating event
      io.to(auctionId).emit("bidUpdated", updatedAuction);
    } catch (error) {
      console.error(error);
    }
  });

  // on leaving connection
  socket.on("disconnect", () => {});
});

server.listen(port, () => {
  console.log(`Server at port: ${port}`);
});

export { server, io };

// job scheduling cron
import cron from "cron";
import sendEmail from "./sendEmail.js";
import User from "./models/userModel.js";

const executeCronJob = async () => {
  const auctions = await Auction.find({ winner: { $exists: false } });
  auctions.forEach(async (auction) => {
    const timeLeft = auction.timeLeft;
    if (timeLeft <= 0) {
      const highestBidAmount = auction.highestBid;
      const highestBid = auction.bids.find((bid) => {
        return bid.bidAmount == highestBidAmount;
      });
      const highestBidder = highestBid.bidder;
      auction.winner = highestBidder;
      const savedAuction = await auction.save();
      const highestBidderDoc = await User.findOne({ name: highestBidder });

      // email parameters
      const subject = "You have won the bid";
      const send_to = highestBidderDoc.email;
      const sent_from = process.env.EMAIL_USER;
      const reply_to = "wrongdirection72@gmail.com";
      const template = "verifyEmail";
      const name = highestBidder;
      const auctionTitle = auction.title;
      const description = `Congratulations ${name} you have won bid titled ${auctionTitle}`;
      sendEmail(
        subject,
        send_to,
        sent_from,
        reply_to,
        template,
        name,
        description
      );
    }
  });
};

// job scheduling using cron
var CronJob = cron.CronJob;
var job = new CronJob(
  "* * * * * *",
  executeCronJob,
  null,
  true,
  "America/Los_Angeles"
);
job.start();
