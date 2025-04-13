import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Récupérer les paramètres et navigation
import axios from "axios";

const EditUserForm = () => {
    const { id } = useParams(); // Récupérer l'ID de l'utilisateur depuis l'URL
    const navigate = useNavigate(); // Pour rediriger après la modification

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
    });

    // Charger les informations de l'utilisateur depuis l'API
    useEffect(() => {
        axios.get(`http://localhost:8080/api/users/${id}`)
            .then(response => setFormData(response.data))
            .catch(error => console.error("Error loading user:", error));
    }, [id]);

    // Gérer les modifications du formulaire
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    // Soumettre les modifications
    const handleSubmit = (e) => {
        e.preventDefault();
        axios.put(`http://localhost:8080/api/users/${id}`, formData)
            .then(() => {
                alert("User updated successfully!");
                navigate("/users"); // Rediriger vers la liste des utilisateurs
            })
            .catch(error => console.error("Error during update:", error));
    };

    return (
        <div>
            <h2> Edit user</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>First name:</label>
                    <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label>Name :</label>
                    <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label>Email:</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                
                <button type="submit">Save
                </button>
                <button type="button" onClick={() => navigate("/users")}>Cancel</button>
            </form>
        </div>
    );
};

export default EditUserForm;
