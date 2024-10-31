import { Theme, createTheme } from '@mui/material/styles'

import {
  // button1,
  // button2,
  hoverColor,
  // borderColor,
  primaryText,
  secondaryText,
  grey600,
  grey700,
  grey800,
  grey900,
  black,
  white,
  red,
  green,
  grey500,
  grey300,
  grey400,
  greyA100,
  greyA200,
  greyA400,
  grey200,
  grey100,
  greyA700,
  gradientStart,
  gradientEnd,
} from './colors'
import { getOverridesComponent } from './overridesComponent'
import { getTypography } from './typography'

// Keeping one theme object and switch data using the mode param
export const createCustomTheme = ({
  mode = 'dark',
}: {
  mode?: 'dark' | 'light'
}): Theme => {
  const baseTheme = createTheme({
    spacing: (x: number) => `${x * 8}px`,
    palette: {
      mode,
      primary: {
        main: primaryText,
        dark: primaryText,
        light: white,
      },
      secondary: {
        main: secondaryText,
        dark: secondaryText,
        light: white,
      },
      hover: hoverColor,
      error: {
        main: red,
      },
      success: {
        main: green,
      },
      grey: {
        100: grey100,
        200: grey200,
        300: grey300,
        400: grey400,
        500: grey500,
        600: grey600,
        700: grey700,
        800: grey800,
        900: grey900,
        A100: greyA100,
        A200: greyA200,
        A400: greyA400,
        A700: greyA700,
      },
      text: {
        primary: mode === 'dark' ? white : black,
        secondary: secondaryText,
        disabled: grey600,
      },
      info: {
        main: gradientStart,
        contrastText: gradientEnd,
      },
      background: {
        // github dark mode
        default: mode === 'dark' ? '#06090f' : white,
        paper: mode === 'dark' ? '#0d1117' : white,
      },
    },
  })

  return createTheme({
    ...baseTheme,
    components: getOverridesComponent(baseTheme),
    typography: getTypography(baseTheme),
  })
}

export const createCustomThemeLight = ({
  mode = 'light',
}: {
  mode: 'light' | 'dark'
}): Theme => {
  const baseTheme = createTheme({
    spacing: (x: number) => `${x * 8}px`,
    palette: {
      mode,
      primary: {
        main: primaryText,
        dark: primaryText,
        light: white,
      },
      secondary: {
        main: secondaryText,
        dark: secondaryText,
        light: white,
      },
      hover: hoverColor,
      error: {
        main: red,
      },
      success: {
        main: green,
      },
      grey: {
        100: grey100,
        200: grey200,
        300: grey300,
        400: grey400,
        500: grey500,
        600: grey600,
        700: grey700,
        800: grey800,
        900: grey900,
        A100: greyA100,
        A200: greyA200,
        A400: greyA400,
        A700: greyA700,
      },
      text: {
        primary: mode === 'dark' ? white : black,
        secondary: secondaryText,
        disabled: grey600,
      },
      background: {
        // Uniswap colors without the gradients
        default: mode === 'dark' ? '#212429' : white,
        paper: mode === 'dark' ? '#191b1f' : white,
        // Close to material colors
        // default: mode === 'dark' ? '#0A0A0A' : white,
        // paper: mode === 'dark' ? '#121212' : white,
      },
    },
  })

  return createTheme({
    ...baseTheme,
    components: getOverridesComponent(baseTheme),
    typography: getTypography(baseTheme),
  })
}

export default createCustomTheme({ mode: 'dark' })
