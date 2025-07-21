import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ['chrome-extension://*', 'http://localhost:*'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

const X_API_BASE_URL = 'https://api.twitter.com/2';
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;

// Basic route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Gmail-X Proxy Server',
        description: 'Proxy server for Chrome extension to access X (Twitter) API',
        status: 'running'
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


app.get('/api/x/timeline/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { max_results = 10 } = req.query;
        
        if (!X_BEARER_TOKEN) {
            return res.status(500).json({ error: 'X API Bearer token not configured' });
        }

        const response = await axios.get(`${X_API_BASE_URL}/users/${userId}/tweets`, {
            headers: {
                'Authorization': `Bearer ${X_BEARER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            params: {
                max_results,
                'tweet.fields': 'created_at,author_id,public_metrics,text',
                'user.fields': 'name,username,profile_image_url'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('X API Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch timeline',
            details: error.response?.data || error.message
        });
    }
});

app.get('/api/x/search', async (req, res) => {
    try {
        const { query, max_results = 10 } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        if (!X_BEARER_TOKEN) {
            return res.status(500).json({ error: 'X API Bearer token not configured' });
        }

        const response = await axios.get(`${X_API_BASE_URL}/tweets/search/recent`, {
            headers: {
                'Authorization': `Bearer ${X_BEARER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            params: {
                query,
                max_results,
                'tweet.fields': 'created_at,author_id,public_metrics,text',
                'user.fields': 'name,username,profile_image_url',
                'expansions': 'author_id'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('X API Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to search tweets',
            details: error.response?.data || error.message
        });
    }
});

app.get('/api/x/user/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        if (!X_BEARER_TOKEN) {
            return res.status(500).json({ error: 'X API Bearer token not configured' });
        }

        const response = await axios.get(`${X_API_BASE_URL}/users/by/username/${username}`, {
            headers: {
                'Authorization': `Bearer ${X_BEARER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            params: {
                'user.fields': 'name,username,profile_image_url,public_metrics,description,verified'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('X API Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch user info',
            details: error.response?.data || error.message
        });
    }
});

app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Gmail-X proxy server running on port ${PORT}`);
    console.log(`X API Bearer Token: ${X_BEARER_TOKEN ? 'Configured' : 'Not configured'}`);
});
