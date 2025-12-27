import mongoose from "mongoose";
import PriceConfig from "../models/priceConfig.model.js";
import dotenv from "dotenv";
dotenv.config();

const fixPriceConfigData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const config = await PriceConfig.findOne().sort({ createdAt: -1 });
    
    if (config) {
      console.log("Found existing config, fixing addons structure...");
      
      const addons = config.addons || {};
      const fixedAddons = {};
      
      const addonTypes = ['campsite', 'bonfire', 'conference', 'rooms'];
      const addonLabels = {
        campsite: "Campsite",
        bonfire: "Bonfire", 
        conference: "Conference Hall",
        rooms: "Guest Rooms"
      };
      
      for (const type of addonTypes) {
        if (typeof addons[type] === 'number') {
          fixedAddons[type] = {
            label: addonLabels[type],
            price: addons[type],
            enabled: true
          };
        } else if (addons[type] && typeof addons[type] === 'object') {
          fixedAddons[type] = {
            label: addons[type].label || addonLabels[type],
            price: addons[type].price || 0,
            enabled: addons[type].enabled !== undefined ? addons[type].enabled : true
          };
        } else {
          fixedAddons[type] = {
            label: addonLabels[type],
            price: type === 'campsite' ? 4000 : 
                   type === 'bonfire' ? 2000 : 
                   type === 'conference' ? 5000 : 8000,
            enabled: true
          };
        }
      }
      
      let fixedSlots = config.shortCruiseSlots || [];
      if (fixedSlots.length === 0) {
        fixedSlots = [
          { label: "Midway Dining Cruise", time: "12:30 PM – 02:30 PM", price: 0, enabled: true },
          { label: "Sunset Serenity Cruise", time: "03:30 PM – 05:00 PM", price: 2000, enabled: true },
          { label: "Moonlight Cruise", time: "07:00 PM – 09:00 PM", price: 4000, enabled: true }
        ];
      }
      
      config.addons = fixedAddons;
      config.shortCruiseSlots = fixedSlots;
      
      await config.save();
      console.log("Price config fixed successfully!");
    } else {
      const defaultConfig = await PriceConfig.create({
        basePrice: 8000,
        shortCruiseSlots: [
          { label: "Midway Dining Cruise", time: "12:30 PM – 02:30 PM", price: 0, enabled: true },
          { label: "Sunset Serenity Cruise", time: "03:30 PM – 05:00 PM", price: 2000, enabled: true },
          { label: "Moonlight Cruise", time: "07:00 PM – 09:00 PM", price: 4000, enabled: true }
        ],
        addons: {
          campsite: { label: "Campsite", price: 4000, enabled: true },
          bonfire: { label: "Bonfire", price: 2000, enabled: true },
          conference: { label: "Conference Hall", price: 5000, enabled: true },
          rooms: { label: "Guest Rooms", price: 8000, enabled: true }
        },
        includedGuests: 1,
        extraGuestPrice: 300,
        maxGuests: 150
      });
      console.log("Created default price config!");
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
};

fixPriceConfigData();