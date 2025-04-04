// Apple-style Minimalist Home.jsx with motion fix

import { Box, Typography, Stack, Button } from "@mui/material";
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import BoltIcon from '@mui/icons-material/Bolt';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const MotionButton = motion(Button);

export default function Home() {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, ease: "easeInOut" }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        textAlign: 'center',
        bgcolor: '#fff',
        color: '#000',
        px: 2
      }}
    >

      <Stack
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.3, ease: "easeInOut" }}
        direction="row"
        spacing={1}
        justifyContent="center"
        alignItems="center"
        mb={3}
      >
        <FitnessCenterIcon sx={{ fontSize: { xs: 48, md: 64 } }} />
        <BoltIcon sx={{ fontSize: { xs: 36, md: 48 } }} />
        <SmartToyIcon sx={{ fontSize: { xs: 36, md: 48 } }} />
      </Stack>

      <Typography
        component={motion.h1}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6, ease: "easeInOut" }}
        variant="h2"
        fontWeight={600}
        gutterBottom
      >
        AI Fitness Trainer
      </Typography>

      <Typography
        component={motion.h2}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.9, ease: "easeInOut" }}
        variant="h6"
        fontWeight={300}
        gutterBottom
        sx={{ maxWidth: 600 }}
      >
        Minimal, Private & AI-powered Form Coach — In Your Browser.
      </Typography>

      <MotionButton
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.2, ease: "easeInOut" }}
        variant="contained"
        component={Link}
        to="/collect"
        sx={{
          mt: 4,
          borderRadius: 10,
          textTransform: 'none',
          px: 5,
          py: 1.5,
          bgcolor: '#000',
          color: '#fff',
          '&:hover': { bgcolor: '#111' }
        }}
      >
        Get Started
      </MotionButton>

    </Box>
  );
}