import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import LoginPage from '../pages/LoginPage';
import JsaWizardPage from '../pages/JsaWizardPage';
import ReviewPage from '../pages/ReviewPage';
import SupervisorPage from '../pages/SupervisorPage';
import FormBuilderPage from '../pages/FormBuilderPage';
import DocumentsPage from '../pages/DocumentsPage';
import SyncPage from '../pages/SyncPage';
import { User } from '../types';

const AppShell = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // On mount, try to restore user from localStorage or load from API
        const token = localStorage.getItem('token');
        if (token) {
            // Try to load user data from localStorage
            const userData = localStorage.getItem('user');
            if (userData) {
                setUser(JSON.parse(userData));
            }
        }
        setLoading(false);
    }, []);

    const handleLogin = (userData: User, token: string) => {
        setUser(userData);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
    }

    const isAuthenticated = !!user || localStorage.getItem('token');

    return (
        <Router>
            <Routes>
                <Route
                    path="/"
                    element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
                />
                <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                <Route
                    path="/dashboard"
                    element={
                        isAuthenticated ? (
                            <DashboardPage user={user} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />
                <Route
                    path="/jsa/new"
                    element={
                        isAuthenticated ? (
                            <JsaWizardPage user={user} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />
                <Route
                    path="/jsa/:id/review"
                    element={
                        isAuthenticated ? (
                            <ReviewPage user={user} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />
                <Route
                    path="/supervisor"
                    element={
                        isAuthenticated ? (
                            <SupervisorPage user={user} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />
                <Route
                    path="/forms"
                    element={
                        isAuthenticated ? (
                            <FormBuilderPage user={user} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />
                <Route
                    path="/documents"
                    element={
                        isAuthenticated ? (
                            <DocumentsPage user={user} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />
                <Route
                    path="/sync"
                    element={
                        isAuthenticated ? (
                            <SyncPage user={user} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />
            </Routes>
        </Router>
    );
};

export default AppShell;
