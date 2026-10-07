// ══════════════════════════════════════════
// Talk Catalog
// Small talk, organised by theme
//
// Each theme: what blocky does when it hears it, and the ways to say it.
//   react   — { chain | gesture, ambient } — same shape as presence's INTENT_MAP.
//             `chain` can be a list: one is picked at random, never twice in a row
//   phrases — examples for the NLU (nlu.js embeds them at init)
//
// A theme's key is its intent name. Phrases are written the way the
// recognizer delivers them, contractions included.
// ══════════════════════════════════════════

export const themes = {

  // ── Water: blocky hates getting wet. Every offer gets a big NO. ──

  water: {
    react: { chain: ['disagree_strong', 'refuse_twice', 'refuse_recoil', 'refuse_suspicious'], ambient: 'calm' },
    phrases: [
      // bath
      'do you want a bath',
      'do you want to take a bath',
      'bath time',
      'it is time for your bath',
      "let's give you a bath",
      'you need a bath',
      // shower
      'do you want to take a shower',
      'go take a shower',
      'time for a shower',
      'you should have a shower',
      // drinking
      'do you want to drink water',
      'do you want some water',
      'are you thirsty',
      'here is a glass of water for you',
      'drink your water',
      // rain
      'do you want to walk in the rain',
      'do you want to go out in the rain',
      "let's go outside it is raining",
      // getting wet
      'do you want to go swimming',
      "let's jump in the pool",
      'I am going to wash you',
      'do you want to get wet',
      'I will splash you',
    ],
  },

  // ── Food: blocky is always hungry. Every offer gets a big YES. ──

  food: {
    react: { chain: ['agree_strong', 'accept_starry', 'accept_excited'], ambient: 'happy' },
    phrases: [
      // hungry?
      'are you hungry',
      'do you want something to eat',
      'do you want to eat',
      "let's eat",
      'time to eat',
      // treats
      'do you want a cookie',
      'do you want a snack',
      'would you like a treat',
      'do you want some candy',
      'do you want some chocolate',
      'do you want ice cream',
      'I have a cookie for you',
      // meals
      'do you want some pizza',
      'do you want breakfast',
      'do you want some cake',
      'here is your dinner',
      'do you want a banana',
      'do you want some pasta',
    ],
  },
};
