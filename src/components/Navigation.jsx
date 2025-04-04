// Apple-style Minimalist Navigation.jsx with smooth motion

import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export default function Navigation() {
  const location = useLocation();

  return (
    <AppBar
      component={motion.div}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: "easeInOut" }}
      position="fixed"
      elevation={0}
      sx={{
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        backgroundColor: 'rgba(255,255,255,0.7)',
        color: '#000',
        px: 4
      }}
    >
      <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>

        <Typography variant="h6" fontWeight={500} sx={{ ml: 2 }}>
          AI Trainer
        </Typography>

        <Box>
          {['home', 'collect', 'train', 'predict'].map((route) => (
            <Button
              key={route}
              component={Link}
              to={`/${route}`}
              disableRipple
              sx={{
                color: location.pathname === `/${route}` ? '#000' : '#555',
                fontWeight: location.pathname === `/${route}` ? 600 : 400,
                textTransform: 'none',
                mx: 1.5,
                borderRadius: 2,
                '&:hover': { background: 'transparent', color: '#000' }
              }}
            >
              {route.charAt(0).toUpperCase() + route.slice(1)}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
