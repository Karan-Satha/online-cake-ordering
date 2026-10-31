export function buildCakePrompt(data) {
  return `
        Luxury bespoke cake design.

        Cake Type: ${data.cakeType}
        Shape: ${data.shape}
        Tiers: ${data.tiers}
        Size: ${data.cakeSize}
        Flavour: ${data.flavour}

        Style: ${data.style}
        Theme: ${data.theme}

        Primary Colour: ${data.primaryColour}
        Secondary Colour: ${data.secondaryColour}

        Decorations: ${data.decorations?.join(", ") || "None"}

        Cake Message: ${data.cakeMessage || "None"}

        Customer Notes:
        ${data.notes || "None"}

        Create a premium handcrafted cake suitable for a professional bakery.
        Ultra realistic luxury cake.
        Professional bakery photography.
        Premium cake catalogue.
        White studio background.
        High detail.
  `.trim();
}
