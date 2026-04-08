import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import Layout from './components/Layout/Layout.jsx';
import Dashboard from './components/Dashboard/Dashboard.jsx';
import AppointmentList from './components/Appointments/AppointmentList.jsx';
import ClientList from './components/Clients/ClientList.jsx';
import Statistics from './components/Stats/Statistics.jsx';
import Settings from './components/Settings/Settings.jsx';
import TagsPage from './components/Tags/TagsPage.jsx';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="appointments" element={<AppointmentList />} />
            <Route path="clients" element={<ClientList />} />
            <Route path="stats" element={<Statistics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="tags" element={<TagsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}