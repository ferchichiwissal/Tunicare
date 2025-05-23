import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import axios from 'axios'; // Import axios
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { clearUserData, getToken, isTokenExpired } from '../utils/auth'; // Import auth utils
import './Chatbot.css';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Backend API endpoint for the chatbot
const BACKEND_API_URL = 'http://localhost:6952/api/chatbot/query'; // Assuming backend runs on port 6952

const Chatbot = () => {
  const { t } = useTranslation(); // Initialize translation hook
  const [isOpen, setIsOpen] = useState(false);
  // Initialize with translated greeting
  const [messages, setMessages] = useState([{ sender: 'bot', text: t('chatbot.greeting') }]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false); // To show loading state
  const messagesEndRef = useRef(null); // Ref to scroll to bottom
  const navigate = useNavigate(); // Initialize useNavigate

  // --- Logout Function ---
  const performLogout = useCallback(() => {
    clearUserData();
    alert(t('chatbot.alerts.sessionExpired')); // Add translation key
    navigate("/sign-in");
  }, [navigate, t]);

  // --- Token Expiry & Inactivity Checks ---
  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      performLogout();
      return;
    }
    let expiryTimer;
    try {
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = decodedToken.exp * 1000;
      const currentTime = Date.now();
      const timeToExpire = expiryTime - currentTime;
      if (timeToExpire > 0) {
        expiryTimer = setTimeout(performLogout, timeToExpire);
      } else {
        performLogout();
        return;
      }
    } catch (err) {
      console.error("Error decoding token for expiry check:", err);
      performLogout();
      return;
    }
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(performLogout, INACTIVITY_TIMEOUT);
    };
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    activityEvents.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(expiryTimer);
      clearTimeout(inactivityTimer);
      activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [performLogout]);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Update initial greeting if language changes after component mount
    setMessages([{ sender: 'bot', text: t('chatbot.greeting') }]);
  }, [t]); // Re-run effect if translation function changes

  useEffect(() => {
    if (isOpen) { // Only scroll when chat is open
        scrollToBottom();
    }
  }, [messages, isOpen]); // Scroll when messages change or chat opens


  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (trimmedInput === '' || isLoading) return;

    const userMessage = { sender: 'user', text: trimmedInput };
    setMessages(prevMessages => [...prevMessages, userMessage]); // Update UI immediately
    setInputValue('');
    setIsLoading(true);

    try {
      // Get the auth token from storage
      const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Handle case where user is somehow unauthenticated but component is visible
        console.warn("Chatbot: No auth token found.");
        // Optionally, add a message to the chat indicating an auth issue
        setMessages(prevMessages => [...prevMessages, { sender: 'bot', text: 'Erreur: Vous n\'êtes pas authentifié.' }]);
        setIsLoading(false);
        return;
      }

      // Call the backend endpoint with auth header
      const response = await axios.post(BACKEND_API_URL,
        { message: trimmedInput }, // Request body
        { headers: headers }       // Request headers
      );

      const botMessage = { sender: 'bot', text: response.data.reply || "Désolé, je n'ai pas compris." };
      setMessages(prevMessages => [...prevMessages, botMessage]);

    } catch (error) {
      console.error("Error calling backend chatbot API:", error);
      const errorMessageText = error.response?.data?.reply || 'Erreur de communication avec le serveur du chatbot.';
      const errorMessage = { sender: 'bot', text: `Erreur: ${errorMessageText}` };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
      <button className="chatbot-toggle-button" onClick={toggleChat}>
        {isOpen ? t('chatbot.close') : t('chatbot.open')}
      </button>
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="message bot loading">
                <span>.</span><span>.</span><span>.</span> {/* Simple loading indicator */}
              </div>
            )}
            {/* Element to scroll to */}
            <div ref={messagesEndRef} />
          </div>
          <div className="chatbot-input">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={t('chatbot.placeholder')}
            />
            <button onClick={handleSendMessage}>{t('chatbot.send')}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
