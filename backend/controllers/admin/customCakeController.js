import {
  getCustomCakeRequests,
  getCustomCakeRequestById,
  updateCustomCakeStatus,
  updateCustomCakeQuote,
  updateCustomCakeNotes,
} from "../../services/admin/customCakeService.js";

export async function getCustomCakes(req, res, next) {
  try {
    const cakes = await getCustomCakeRequests();

    res.json({
      success: true,
      data: cakes,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomCake(req, res, next) {
  try {
    const cake = await getCustomCakeRequestById(req.params.id);

    if (!cake) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    res.json({
      success: true,
      data: cake,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;

    const cake = await updateCustomCakeStatus(req.params.id, status);

    res.json({
      success: true,
      data: cake,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateQuote(req, res, next) {
  try {
    const { quotedPrice } = req.body;

    const cake = await updateCustomCakeQuote(req.params.id, quotedPrice);

    res.json({
      success: true,
      data: cake,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateNotes(req, res, next) {
  try {
    const { adminNotes } = req.body;

    const cake = await updateCustomCakeNotes(req.params.id, adminNotes);

    res.json({
      success: true,
      data: cake,
    });
  } catch (error) {
    next(error);
  }
}
