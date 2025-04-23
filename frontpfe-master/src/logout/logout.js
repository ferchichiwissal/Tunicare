import React, { useState, useContext } from "react"; // Import useContext
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Import useTranslation
import apiClient from "../utils/apiClient";
import AuthContext from '../context/AuthContext'; // Import AuthContext
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import "./logout.css" // Importez le fichier CSS

const Logout = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(); // Get translation function
  const { logout: contextLogout } = useContext(AuthContext); // Get logout from context
  const [open, setOpen] = useState(true); // La boîte de dialogue s'ouvre directement

  const handleClose = () => {
    setOpen(false);
    navigate(-1); // Retourne à la page précédente
  };

  const handleLogout = async () => {
    try {
      // Notify the backend to invalidate the refresh token
      const refreshToken =
        localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

      if (refreshToken) {
        await apiClient.post("/auth/logout", { refreshToken });
      }

      // Clear tokens and remember me preference
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");

      // Call context logout to clear user state
      contextLogout(); 

      // Navigate to the login page
      navigate("/sign-in");
    } catch (error) {
      console.error("Error during logout:", error);
      // Optionally handle errors (e.g., show a message to the user)
      navigate("/sign-in"); // Redirect to login regardless
    } finally {
      setOpen(false); // Fermer la boîte de dialogue
    }
  };

  return (
    <div>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        className="logout-dialog" // Appliquez la classe CSS
      >
        <DialogTitle id="alert-dialog-title" className="logout-dialog-title">
          {t('logout.dialog.title')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description" className="logout-dialog-content">
            {t('logout.dialog.confirmationText')}
          </DialogContentText>
        </DialogContent>
        <DialogActions className="logout-dialog-actions">
          <Button
            onClick={handleClose}
            className="logout-dialog-button cancel"
          >
            {t('logout.dialog.cancelButton')}
          </Button>
          <Button
            onClick={handleLogout}
            className="logout-dialog-button confirm"
            autoFocus
          >
            {t('logout.dialog.logoutButton')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Logout;
