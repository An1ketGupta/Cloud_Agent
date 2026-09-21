import express from 'express';
import 'dotenv/config'
import { authRouter } from './routes/authRoutes.js';
import { githubRouter } from './routes/githubRoutes.js';
import cookieParser from 'cookie-parser';
import { myRouter } from './routes/myRoutes.js';
import { taskRouter } from './routes/taskRoutes.js';

const app = express();
app.use(express.json())
app.use(cookieParser())

app.use('/auth', authRouter)
app.use('/auth/github', githubRouter)
app.use('/me', myRouter)
app.use('/task', taskRouter)

app.listen(3001, ()=>{
    console.log("App is listening on port 3001")
})