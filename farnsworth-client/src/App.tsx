import React, { useState, useEffect } from 'react';
// @ts-ignore
import logo from './Ancom_flag.svg';
import './App.css';
import { Button } from "@mui/material";
import { login } from "./api";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import MediaManager from "./components/MediaManager";

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Check for token in localStorage or cookies
        const token = document.cookie.split('; ').find(row => row.startsWith('auth-token='));
        if (token) {
            setIsLoggedIn(true);
        }
    }, []);

    const handleLogin = async () => {
        try {
            await login();
            // The redirect will happen, so no need to set state here
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    const handleLogout = () => {
        // Clear the auth-token cookie
        document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        setIsLoggedIn(false);
    };

    return (

        <div className="App">
            <ThemeProvider theme={darkTheme}>
                <CssBaseline/>
                {isLoggedIn ? (
                    <div>
                        <MediaManager handleLogout={handleLogout}></MediaManager>
                    </div>
                ) : (
                    <div>
                        <img src={logo} alt="logo"/>
                        <p>
                            Johnny Silverhand was right
                        </p>
                        <Button variant="contained" onClick={handleLogin}>Agree?</Button>
                    </div>
                )}

            </ThemeProvider>
        </div>
    );
}

export default App;