import React, { Suspense } from 'react'; // Import Suspense
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RegistrationForm from "./inscription/RegistrationForm";
import ConfirmationPage from "./inscription/ConfirmationPage";
//import Homepage from "./home/HelloWorld";

import Template from "./component/template"
import Login from "./login/Login";
import Logout from './logout/logout';
import ResetPass from "./login/ResetPass";

// Removed duplicate React import
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
import { ThemeProvider } from './utils/ThemeContext'; // Import ThemeProvider
import Activation from './Interface/CRUD users/Activation'; // Import the new Activation component

// Import CentreDexamen components
import CentreDexamenList from './Interface/CRUD_Centres/CentreDexamenList';
import AddCentreDexamenForm from './Interface/CRUD_Centres/AddCentreDexamenForm';
import EditCentreDexamenForm from './Interface/CRUD_Centres/EditCentreDexamenForm';
import RegisterDoctorCentreForm from './Interface/CRUD_Centres/RegisterDoctorCentreForm';
import EditDoctorCentreForm from './Interface/CRUD users/EditDoctorCentreForm'; // Import the new form

const onLogout = () => {
  // Clear tokens from localStorage and sessionStorage
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");
};

function App() {
  return (
    <ThemeProvider>
      <Router>
      {/* Wrap Routes with Suspense for i18next loading */}
      <Suspense fallback={<div>Loading translations...</div>}>
        <Routes>
          <Route path="/sign-in" element={<Login />} />
          <Route path="/Logout" element={<Logout />} />

          <Route path="/" element={<Template />} />
          <Route path="/reset-password" element={<ResetPasswordPage/>} />


          <Route path="/Registration" element={<RegistrationForm />} />

          <Route path="/confirmation" element={<ConfirmationPage />} />
          <Route path="/resetpassword" element={<ResetPass />} />
          <Route path='/dashboard' element={<Dashboard onLogout={onLogout}/>} />
          <Route path="/add" element={<AddForm/>} />
          <Route path="/bloque" element={<ComptenotValide/>}/>
          <Route path="/Tovalidate" element={<CompteValide onLogout={onLogout} />}/>
          <Route path="/UserManagement" element={<UserManagement onLogout={onLogout} />}/>

          <Route path="/users" element={<UserList />} />
          <Route path="/edit-user/:id" element={<EditUserForm />}/>
          {/* Route for editing a DoctorCentreDexamen, protected for Admin */}
          <Route path="/edit-doctor-centre/:id" element={
            <ProtectedLayout requiredRole={["ROLE_ADMIN", "ROLE_DOCTOR_CENTRE_EXAMEN"]}> {/* Corrected role string */}
              <EditDoctorCentreForm />
            </ProtectedLayout>
          } />

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

          {/* --- Centre d'examen Routes --- */}
          {/* Public registration route */}
          <Route path="/register-doctor-centre" element={<RegisterDoctorCentreForm />} />

          {/* Protected routes for managing centres */}
          <Route path="/manage-centres" element={
            <ProtectedLayout>
              <CentreDexamenList />
            </ProtectedLayout>
          } />
          <Route path="/add-centre" element={
            <ProtectedLayout>
              <AddCentreDexamenForm />
            </ProtectedLayout>
          } />
          <Route path="/edit-centre/:id" element={
            <ProtectedLayout>
              <EditCentreDexamenForm />
            </ProtectedLayout>
          } />
          {/* --- End Centre d'examen Routes --- */}

          {/* Route for Doctor Activation Management, protected for Admin */}
          <Route path="/activation" element={
            <ProtectedLayout requiredRole="ROLE_ADMIN">
              <Activation />
            </ProtectedLayout>
          } />

           </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;
