import { Components, Theme } from "@mui/material/styles";

import { fontSourceCodePro } from "./fonts";

export const getOverridesComponent = (
  baseTheme: Theme,
  // font?: string,
): Components => {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          fontSize: 16,
        },
        body: {
          fontFamily: fontSourceCodePro,
          boxSizing: "border-box",
          height: "100%",
          margin: 0,
          padding: 0,
          backgroundColor: baseTheme.palette.background.default,
        },
        a: {
          color: "currentColor",
          textDecoration: "none",

          "&:hover": {
            textDecoration: "underline",
          },
        },
        "p, span": {
          color: "currentColor",
          margin: 0,
          padding: 0,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        contained: {
          color: baseTheme.palette.common.white,
          backgroundColor: baseTheme.palette.common.black,
          minWidth: 200,
          padding: baseTheme.spacing(1.5),
          fontWeight: 450,
          "&:hover": {
            backgroundColor: baseTheme.palette.hover,
          },
        },
        containedSizeMedium: {
          fontSize: 16,
          lineHeight: "19px",
        },
        containedSizeSmall: {
          fontSize: 10,
          lineHeight: 1,
          padding: baseTheme.spacing(1),
          fontWeight: 600,
          minWidth: "auto",
        },
        containedSizeLarge: {
          fontSize: 18,
          lineHeight: "21px",
        },
        outlined: {
          color: baseTheme.palette.primary.main,
          minWidth: 200,
          padding: baseTheme.spacing(1.5, 3),
          fontWeight: 600,
          border: `2px solid ${baseTheme.palette.grey[600]}`,

          "&:hover": {
            borderWidth: 2,
          },
        },
        outlinedSizeLarge: {
          fontSize: 16,
          lineHeight: "19px",
        },
        outlinedSizeMedium: {
          fontSize: 18,
          lineHeight: "21px",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border:
            baseTheme.palette.mode === "light"
              ? `1px solid ${baseTheme.palette.grey[400]}`
              : `none`,
          backgroundColor: baseTheme.palette.background.paper,
          padding: baseTheme.spacing(3.75, 4),
          // boxShadow: 'none',
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        filled: {
          border: `none`,
          backgroundColor: baseTheme.palette.background.paper,
          padding: baseTheme.spacing(0.5, 1),
          borderRadius: 25,
          fontFamily: fontSourceCodePro,
          fontWeight: 500,
          fontSize: 12,
          lineHeight: "14px",
        },
        outlined: {
          border: `1px solid ${baseTheme.palette.common.black}`,
          backgroundColor: baseTheme.palette.background.paper,
          padding: baseTheme.spacing(0.5, 1),
          borderRadius: 25,
          fontFamily: fontSourceCodePro,
          fontWeight: 500,
          fontSize: 12,
          lineHeight: "14px",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          backgroundColor: "transparent",
          padding: baseTheme.spacing(1, 2.5),
          color:
            baseTheme.palette.mode === "light"
              ? baseTheme.palette.common.black
              : baseTheme.palette.common.white,
          borderRadius: 42,
          minHeight: "auto",
          fontFamily: fontSourceCodePro,
          fontSize: 16,
          lineHeight: "18px",
          fontWeight: 500,
          textTransform: "none",

          "&.Mui-selected": {
            background: baseTheme.palette.common.black,
            color:
              baseTheme.palette.primary.contrastText ||
              baseTheme.palette.primary.main,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          padding: baseTheme.spacing(0, 0, 2.5),
          borderBottom: `1px solid ${baseTheme.palette.grey[500]}`,
        },
        indicator: {
          height: 0,
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        root: {
          "& .MuiBackdrop-root": {
            background: `none`,
            backdropFilter: `none`,
          },
        },
        paper: {
          border: `1px solid ${baseTheme.palette.grey[400]}`,
          backgroundColor: baseTheme.palette.background.paper,
          boxShadow: "none",
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: baseTheme.palette.background.paper,
          boxShadow: `0px 5px 17px rgba(0, 0, 0, 0.2)`,
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          background: `linear-gradient(141.55deg, rgba(255, 255, 255, 0.52) 15.61%, rgba(255, 255, 255, 0.3) 82.41%)`,
          backdropFilter: `blur(40px)`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: `none`,
          backgroundColor: baseTheme.palette.background.paper,
          borderRadius: 12,
          boxShadow: `0px 5px 17px rgba(0, 0, 0, 0.2)`,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: baseTheme.palette.grey[400],

          "&.Mui-checked": {
            color: baseTheme.palette.primary.main,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          backgroundColor: baseTheme.palette.background.paper,
          boxShadow: "none",
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 18,
          lineHeight: 1.5,
          paddingTop: baseTheme.spacing(1.82),
          paddingBottom: baseTheme.spacing(1.82),
        },
        icon: {
          width: 13,
          height: 20,
          right: 10,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        input: {
          "&:-webkit-autofill": {
            WebkitBoxShadow:
              baseTheme.palette.mode === "light"
                ? "0 0 0 100px #266798 inset"
                : `0 0 0 100px ${baseTheme.palette.grey["A400"]} inset`,
            WebkitTextFillColor: "#fff",
          },
        },
      },
    },
  };
};
