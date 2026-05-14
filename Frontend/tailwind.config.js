/** @type {import('tailwindcss').Config} */


// eslint-disable-next-line import/no-anonymous-default-export
export default { 
  darkMode: "class",
};

export const content = [
  "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/app/components/**/*.{js,ts,jsx,tsx,mdx}", // ✅ include your app/components folder
];
export const theme = {
  extend: {},
};
export const plugins = [];
