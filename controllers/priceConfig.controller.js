import PriceConfig from "../models/priceConfig.model.js";

const ensureYogaSlot = (slots = []) => {
  const hasYoga = slots.some((s) => s.label === "Yoga & Meditation Cruise");

  if (!hasYoga) {
    slots.unshift({
      label: "Yoga & Meditation Cruise",
      time: "09:00 AM – 11:00 AM",
      adultPrice: 0,
      childPrice: 0,
      enabled: true,
    });
  }

  return slots;
};

export const getCurrentPrices = async (req, res) => {
  try {
    const priceConfig = await PriceConfig.findOne().sort({ createdAt: -1 });

    if (!priceConfig) {
      const defaultConfig = await PriceConfig.create({
        basePrice: 8000,
        shortCruiseSlots: [
          {
            label: "Yoga & Meditation Cruise",
            time: "09:00 AM – 11:00 AM",
            adultPrice: 0,
            childPrice: 0,
            enabled: true,
          },
          {
            label: "Lunch Cruise", // Changed from "Midday Dining Cruise"
            time: "12:30 PM – 02:30 PM",
            adultPrice: 1599,
            childPrice: 1099,
            enabled: true,
          },
          {
            label: "Sunset Serenity Cruise",
            time: "03:30 PM – 05:00 PM",
            adultPrice: 999,
            childPrice: 599,
            enabled: true,
          },
          {
            label: "Moonlight Cruise (Dinner Cruise)",
            time: "07:00 PM – 09:00 PM",
            adultPrice: 1999,
            childPrice: 1199,
            enabled: true,
          },
        ],
        addons: {
          campsite: { label: "Campsite", price: 4000, enabled: true },
          bonfire: { label: "Bonfire", price: 2000, enabled: true },
          conference: { label: "Conference Hall", price: 5000, enabled: true },
          rooms: { label: "Guest Rooms", price: 8000, enabled: true },
        },
        includedGuests: 1,
        extraGuestPrice: 300,
        maxGuests: 150,
      });
      return res.status(200).json({
        success: true,
        data: defaultConfig,
      });
    }

    const addons = priceConfig.addons || {};
    const formattedAddons = {};

    const addonTypes = ["campsite", "bonfire", "conference", "rooms"];
    const addonLabels = {
      campsite: "Campsite",
      bonfire: "Bonfire",
      conference: "Conference Hall",
      rooms: "Guest Rooms",
    };

    for (const type of addonTypes) {
      if (!addons[type] || typeof addons[type] !== "object") {
        formattedAddons[type] = {
          label: addonLabels[type],
          price:
            type === "campsite"
              ? 4000
              : type === "bonfire"
              ? 2000
              : type === "conference"
              ? 5000
              : 8000,
          enabled: true,
        };
      } else {
        formattedAddons[type] = {
          label: addons[type].label || addonLabels[type],
          price: addons[type].price || 0,
          enabled:
            addons[type].enabled !== undefined ? addons[type].enabled : true,
        };
      }
    }

    priceConfig.addons = formattedAddons;
    
    // Ensure all slots have adultPrice and childPrice
    if (priceConfig.shortCruiseSlots && Array.isArray(priceConfig.shortCruiseSlots)) {
      priceConfig.shortCruiseSlots = priceConfig.shortCruiseSlots.map(slot => ({
        ...slot,
        adultPrice: slot.adultPrice || slot.price || 0,
        childPrice: slot.childPrice || 0,
      }));
    }

    res.status(200).json({
      success: true,
      data: priceConfig,
    });
  } catch (error) {
    console.error("Error fetching price config:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching price configuration",
      error: error.message,
    });
  }
};

export const updatePrices = async (req, res) => {
  try {
    const updates = req.body;
    console.log("Received update:", updates);

    const latestConfig = await PriceConfig.findOne().sort({ createdAt: -1 });

    let priceConfig;
    if (latestConfig) {
      if (updates.basePrice !== undefined)
        latestConfig.basePrice = updates.basePrice;
      if (updates.includedGuests !== undefined)
        latestConfig.includedGuests = updates.includedGuests;
      if (updates.extraGuestPrice !== undefined)
        latestConfig.extraGuestPrice = updates.extraGuestPrice;
      if (updates.maxGuests !== undefined)
        latestConfig.maxGuests = updates.maxGuests;

      if (updates.shortCruiseSlots && Array.isArray(updates.shortCruiseSlots)) {
        // Ensure all slots have proper adult/child pricing
        const updatedSlots = updates.shortCruiseSlots.map(slot => ({
          ...slot,
          adultPrice: slot.adultPrice || slot.price || 0,
          childPrice: slot.childPrice || 0,
        }));
        latestConfig.shortCruiseSlots = ensureYogaSlot(updatedSlots);
      }

      if (updates.addons) {
        const updatedAddons = {};

        Object.keys(updates.addons).forEach((key) => {
          const addon = updates.addons[key];
          if (typeof addon === "object" && addon !== null) {
            updatedAddons[key] = {
              label: addon.label || `Addon ${key}`,
              price: addon.price || 0,
              enabled: addon.enabled !== undefined ? addon.enabled : true,
            };
          } else if (typeof addon === "number") {
            updatedAddons[key] = {
              label:
                key === "campsite"
                  ? "Campsite"
                  : key === "bonfire"
                  ? "Bonfire"
                  : key === "conference"
                  ? "Conference Hall"
                  : "Guest Rooms",
              price: addon,
              enabled: true,
            };
          }
        });

        const addonTypes = ["campsite", "bonfire", "conference", "rooms"];
        addonTypes.forEach((type) => {
          if (!updatedAddons[type]) {
            updatedAddons[type] = {
              label:
                type === "campsite"
                  ? "Campsite"
                  : type === "bonfire"
                  ? "Bonfire"
                  : type === "conference"
                  ? "Conference Hall"
                  : "Guest Rooms",
              price:
                type === "campsite"
                  ? 4000
                  : type === "bonfire"
                  ? 2000
                  : type === "conference"
                  ? 5000
                  : 8000,
              enabled: true,
            };
          }
        });

        latestConfig.addons = updatedAddons;
      }

      latestConfig.updatedBy = req.userId;
      priceConfig = await latestConfig.save();
    } else {
      const defaultAddons = {
        campsite: { label: "Campsite", price: 4000, enabled: true },
        bonfire: { label: "Bonfire", price: 2000, enabled: true },
        conference: { label: "Conference Hall", price: 5000, enabled: true },
        rooms: { label: "Guest Rooms", price: 8000, enabled: true },
      };

      // Ensure slots have adult/child pricing
      const slotsWithAdultChildPricing = (updates.shortCruiseSlots || []).map(slot => ({
        ...slot,
        adultPrice: slot.adultPrice || slot.price || 0,
        childPrice: slot.childPrice || 0,
      }));

      const newConfig = {
        ...updates,
        addons: updates.addons || defaultAddons,
        shortCruiseSlots: ensureYogaSlot(slotsWithAdultChildPricing),
        updatedBy: req.userId,
      };

      priceConfig = await PriceConfig.create(newConfig);
    }

    res.status(200).json({
      success: true,
      message: "Price configuration updated successfully",
      data: priceConfig,
    });
  } catch (error) {
    console.error("Error updating price config:", error);
    res.status(500).json({
      success: false,
      message: "Error updating price configuration",
      error: error.message,
    });
  }
};

export const getPriceHistory = async (req, res) => {
  try {
    const history = await PriceConfig.find()
      .sort({ createdAt: -1 })
      .populate("updatedBy", "name email");

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching price history",
      error: error.message,
    });
  }
};