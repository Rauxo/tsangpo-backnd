const PriceConfig = require('../models/PriceConfig');

// Get current price configuration
exports.getPriceConfig = async (req, res) => {
  try {
    const config = await PriceConfig.findOne().sort({ updatedAt: -1 });
    if (!config) {
      // Create default config if none exists
      const defaultConfig = await PriceConfig.create({
        basePrice: 8000,
        includedGuests: 1,
        extraGuestPrice: 300,
        maxGuests: 150,
        shortCruiseSlots: [
          { label: "Midway Dining Cruise", time: "12:30 PM – 02:30 PM", price: 5000, enabled: true },
          { label: "Sunset Serenity Cruise", time: "03:30 PM – 05:00 PM", price: 6000, enabled: true },
          { label: "Moonlight Cruise", time: "07:00 PM – 09:00 PM", price: 7000, enabled: true }
        ],
        addons: {
          decoration: { label: "Special Decoration", price: 2000, enabled: true },
          photography: { label: "Professional Photography", price: 3000, enabled: true },
          catering: { label: "Premium Catering", price: 5000, enabled: true }
        }
      });
      return res.json({ success: true, config: defaultConfig });
    }
    
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching price config' });
  }
};

// Update price configuration
exports.updatePriceConfig = async (req, res) => {
  try {
    const configData = req.body;
    configData.updatedAt = new Date();
    
    const config = await PriceConfig.findOneAndUpdate(
      {},
      configData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating price config' });
  }
};

// Calculate price for a specific form
exports.calculatePrice = async (req, res) => {
  try {
    const { formType, guests, additionalData } = req.body;
    const priceConfig = await PriceConfig.findOne().sort({ updatedAt: -1 });
    
    if (!priceConfig) {
      return res.json({ success: true, totalPrice: 0 });
    }
    
    let total = priceConfig.basePrice;
    
    if (guests > priceConfig.includedGuests) {
      const extraGuests = guests - priceConfig.includedGuests;
      total += extraGuests * priceConfig.extraGuestPrice;
    }
    
    res.json({ success: true, totalPrice: total });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error calculating price' });
  }
};