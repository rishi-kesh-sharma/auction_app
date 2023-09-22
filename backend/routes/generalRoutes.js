import express from "express";
import Auction from "../models/auctionModel.js";

const router = express.Router();

// get general dataend
router.get("/", async (req, res) => {
  try {
    const subjectClasses = Auction.schema.path("subject_class").enumValues;
    const categoryTitles = Auction.schema.path("category.title").enumValues;
    const drawingMediums = Auction.schema
      .path("category.drawing")
      .schema.path("medium").enumValues;
    const paintingMediums = Auction.schema
      .path("category.painting")
      .schema.path("medium").enumValues;
    const photographicImageColorTypes = Auction.schema
      .path("category.photographic_image")
      .schema.path("color_type").enumValues;
    const sculptureMaterials = Auction.schema
      .path("category.sculpture")
      .schema.path("material_used").enumValues;
    const cravingMaterials = Auction.schema
      .path("category.craving")
      .schema.path("material_used").enumValues;
    res.json({
      subjectClasses,
      categoryTitles,
      drawingMediums,
      paintingMediums,
      photographicImageColorTypes,
      sculptureMaterials,
      cravingMaterials,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
