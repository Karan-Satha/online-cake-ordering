import { getOpenAIClient } from "../../services/shop/openai.js";
import { createCustomCakeRequest } from "../../services/shop/customCakeService.js";
import AppError from "../../utils/AppError.js";
import { getProductImageUrl, getCustomCakeImagePath } from "../../services/storage/objectStorage.js";
import { sendEmail } from "../../services/email/emailClient.js";
import { buildCustomCakeRequestReceivedEmail } from "../../services/email/templates/customCakeRequestReceived.js";
import { normalizeEmailAddress } from "../../utils/emailAddress.js";
import { logger } from "../../utils/logger.js";

const ALLOWED_CAKE_SHAPES = ["Round", "Square", "Rectangle", "Heart", "Oval", "Hexagon", "Tall Barrel"];
const ALLOWED_CAKE_TIERS = ["1 Tier", "2 Tier", "3 Tier", "4 Tier"];

function getFallbackImage(data) {
  const cakeType = data.cakeType?.toLowerCase();

  if (cakeType?.includes("wedding")) {
    return getProductImageUrl("1786290703566.webp");
  }

  if (cakeType?.includes("birthday")) {
    return getProductImageUrl("1786293859036.webp");
  }

  if (cakeType?.includes("baby")) {
    return getProductImageUrl("1786293951421.webp");
  }

  return getProductImageUrl("1786293975591.webp");
}

export async function generateCakePreview(req, res) {
  try {
    const openai = getOpenAIClient();
    if (!openai) {
      return res.json({
        success: true,
        generated: false,
        image: getFallbackImage(req.body),
      });
    }

    const {
      cakeType,
      shape,
      tiers,
      cakeSize,
      flavour,
      style,
      theme,
      primaryColour,
      secondaryColour,
      decorations,
      cakeMessage,
      notes,
    } = req.body;

    const prompt = `
      Luxury custom bakery cake.

      Cake type: ${cakeType}
      Shape: ${shape}
      Tiers: ${tiers}
      Size: ${cakeSize}
      Flavour: ${flavour}
      Style: ${style}
      Theme: ${theme}

      Primary colour: ${primaryColour}
      Secondary colour: ${secondaryColour}

      Decorations:
      ${decorations?.join(", ") || ""}

      Cake message:
      ${cakeMessage || ""}

      Additional notes:
      ${notes || ""}

      Ultra realistic luxury cake.
      Professional bakery photography.
      Premium cake catalogue.
      White studio background.
      High detail.
      `;

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      quality: "low",
    });

    res.json({
      success: true,
      generated: true,
      image: result.data[0].url,
    });
  } catch (error) {
    console.error("OPENAI ERROR:", error.message);

    res.json({
      success: true,
      generated: false,
      image: getFallbackImage(req.body),
    });
  }
}

export async function submitCustomCake(req, res, next) {
  try {
    for (const [field, label] of [
      ["cakeType", "cake type"],
      ["name", "name"],
      ["email", "email address"],
      ["phone", "phone number"],
    ]) {
      if (typeof req.body[field] !== "string" || !req.body[field].trim()) {
        throw new AppError(`Please provide your ${label}.`, 400);
      }
    }

    const customerEmail = normalizeEmailAddress(req.body.email);
    if (!customerEmail) {
      throw new AppError("Please provide a valid email address.", 400);
    }

    if (!ALLOWED_CAKE_SHAPES.includes(req.body.shape)) {
      throw new AppError("Please choose a valid cake shape.", 400);
    }

    if (!ALLOWED_CAKE_TIERS.includes(req.body.tiers)) {
      throw new AppError("Please choose a valid number of tiers.", 400);
    }

    if (typeof req.body.theme !== "string" || req.body.theme.length > 100) {
      throw new AppError("Please choose a valid cake theme.", 400);
    }

    if (req.body.theme === "Other" || (req.body.theme.startsWith("Other: ") && !req.body.theme.slice(7).trim())) {
      throw new AppError("Please describe your preferred cake theme.", 400);
    }

    const inspirationImages =
      req.files?.map((file) => getCustomCakeImagePath(file.filename)) || [];

    const customCake = await createCustomCakeRequest({
      ...req.body,
      email: customerEmail,
      inspirationImages,
    });

    const confirmation = buildCustomCakeRequestReceivedEmail({
      customerName: req.body.name,
      referenceNumber: customCake.reference_number,
    });
    const emailResult = await sendEmail({
      to: customerEmail,
      subject: confirmation.subject,
      html: confirmation.html,
      text: confirmation.text,
    });

    if (!emailResult.success) {
      logger.error(`Custom cake request acknowledgement failed for request #${customCake.id}: ${emailResult.error}`);
    }

    res.status(201).json({
      success: true,
      data: customCake,
    });
  } catch (error) {
    next(error);
  }
}
