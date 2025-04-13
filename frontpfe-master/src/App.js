import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RegistrationForm from "./inscription/RegistrationForm";
import ConfirmationPage from "./inscription/ConfirmationPage";
//import Homepage from "./home/HelloWorld";

import Template from "./component/template"
import Login from "./login/Login";
import Logout from './logout/logout';
import ResetPass from "./login/ResetPass";

import React, { useState, useEffect } from 'react';
import UserManagement from "./Interface/CRUD users/changerole"; // Import AddForm here

import CompteValide from "./Interface/CRUD users/Tovalidate"; // Import AddForm here
import UserList from "./Interface/CRUD users/Users Management";
import EditUserForm from "./Interface/CRUD users/EditUserForm";
import Dashboard from "./Interface/dashboard";
import AddForm from "./Interface/CRUD users/AddForm";
import AddCabinetForm from "./Interface/CRUD users/AddCabinetForm";
import CabinetList from "./Interface/CRUD users/CabinetList";
import EditCabinetForm from "./Interface/CRUD users/EditCabinetForm"; // Import EditCabinetForm
import ComptenotValide from "./Interface/CRUD users/bloque";
import ResetPasswordPage from "./login/ResetPasswordPage";
import ChangePassword from './Interface/ChangePassword'; // Import ChangePassword component
import ProtectedLayout from './utils/ProtectedLayout'; // Assuming ProtectedLayout exists

const onLogout = () => {
  // Clear tokens from localStorage and sessionStorage
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/sign-in" element={<Login />} />
        <Route path="/Logout" element={<Logout />} />

        <Route path="/" element={<Template />} />
        <Route path="/reset-password" element={<ResetPasswordPage/>} />


        <Route path="/Registration" element={<RegistrationForm />} />element

        <Route path="/confirmation" element={<ConfirmationPage />} />
        <Route path="/resetpassword" element={<ResetPass />} />
        <Route path='/dashboard' element={<Dashboard onLogout={onLogout}/>} />
        <Route path="/add" element={<AddForm/>} />
        <Route path="/bloque" element={<ComptenotValide/>}/>
        <Route path="/Tovalidate" element={<CompteValide onLogout={onLogout} />}/>
        <Route path="/UserManagement" element={<UserManagement onLogout={onLogout} />}/>

        <Route path="/users" element={<UserList />} />
        <Route path="/edit-user/:id" element={<EditUserForm />}/>

        {/* Route for adding a cabinet, protected */}
        <Route path="/add-cabinet" element={
          <ProtectedLayout>
            <AddCabinetForm />
          </ProtectedLayout>
        } />

        {/* Route for managing cabinets, protected */}
        <Route path="/manage-cabinets" element={
          <ProtectedLayout>
            <CabinetList />
          </ProtectedLayout>
        } />

        {/* Route for editing a cabinet, protected */}
        <Route path="/edit-cabinet/:id" element={
          <ProtectedLayout>
            <EditCabinetForm />
           </ProtectedLayout>
         } />

        {/* Route for changing password, protected */}
        <Route path="/change-password" element={
          <ProtectedLayout>
            <ChangePassword />
          </ProtectedLayout>
        } />

         </Routes>
    </Router>
  );
}

export default App;
