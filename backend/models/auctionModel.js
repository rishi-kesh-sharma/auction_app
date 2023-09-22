import mongoose from "mongoose";

// bid schema
const bidSchema = new mongoose.Schema({
  bidder: { type: String },
  bidAmount: { type: Number, required: true },
  bidTime: { type: Date, default: Date.now },
});

// dimension schema
const dimensionSchema = new mongoose.Schema({
  height: {
    type: Number,
    required: true,
  },
  width: {
    type: Number,
    required: true,
  },
  length: {
    type: Number,
  },
});

//drawing schema
const drawingSchema = new mongoose.Schema({
  medium: {
    enum: ["Pencil", "Ink", "Charcoal", "Other"],
    type: String,
    required: true,
    trim: true,
  },
  is_framed: {
    type: Boolean,
    default: false,
  },
});

//painting schema
const paintingSchema = new mongoose.Schema({
  medium: {
    enum: ["Oil", "Acrylic", "Watercolor", "Other"],
    type: String,
    required: true,
    trim: true,
  },
  is_framed: {
    type: Boolean,
    default: false,
  },
});

//photographic schema
const photographicImagesSchema = new mongoose.Schema({
  color_type: {
    enum: ["Black", "White", "Other"],
    type: String,
    required: true,
    trim: true,
  },
});

//sculpture schema
const sculptureSchema = new mongoose.Schema({
  material_used: {
    enum: ["Bronze", "Marble", "Pewter", "Other"],
    type: String,
    required: true,
    trim: true,
  },
  weight: {
    type: Number,
    required: true,
  },
});

// craving schema
const cravingSchema = new mongoose.Schema({
  material_used: {
    enum: ["Oak", "Beach", "Pine", "Willow", "Other"],
    type: String,
    required: true,
    trim: true,
  },
  weight: {
    type: Number,
    required: true,
  },
});

// auction schema
const auctionSchema = new mongoose.Schema(
  {
    // lot_number: {
    //   type: Number,
    // },
    seller: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    artist: String,
    year_of_production: {
      type: Number,
      required: true,
    },
    subject_class: {
      type: String,
      required: true,
      enum: [
        "Landscape",
        "Seascape",
        "Portrait",
        "Figure",
        "Still Life",
        "Nude",
        "Animal",
        "Abstract",
        "Other",
      ],
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    startingBid: { type: Number, required: true },
    currentBid: { type: Number },
    imageUrl: { type: String, required: true },
    endDate: { type: Date, required: true },
    bids: [bidSchema],
    winner: { type: String },
    dimension: dimensionSchema,
    category: {
      title: {
        type: String,
        enum: [
          "Drawing",
          "Painting",
          "Photographic Image",
          "Sculpture",
          "Craving",
          "Other",
        ],
        trim: true,
        default: "Other",
      },
      drawing: drawingSchema,
      painting: paintingSchema,
      photographic_image: photographicImagesSchema,
      sculpture: sculptureSchema,
      craving: cravingSchema,
    },
  },
  {
    timestamps: true,
  }
);

// virtual for calculating timeLeft
auctionSchema.virtual("timeLeft").get(function () {
  return Math.max(this.endDate - Date.now(), 0);
});

// virtual for calculating highest bid
auctionSchema.virtual("highestBid").get(function () {
  if (!this.bids || this.bids.length === 0) {
    return this.startingBid;
  }
  return this.bids[this.bids.length - 1].bidAmount;
});

// virtual for calculating bidder
auctionSchema.virtual("bidder").get(function () {
  if (!this.bids || this.bids.length === 0) {
    return null;
  }
  return this.bids[this.bids.length - 1].bidder;
});

// pre save hook for winner
auctionSchema.pre("save", function (next) {
  if (this.timeLeft === 0 && this.bids.length > 0) {
    const winningBid = this.bids[this.bids.length - 1];
    this.winner = winningBid.bidder;
  }
  next();
});

// auction model
const Auction = mongoose.model("Auction", auctionSchema);
export default Auction;
