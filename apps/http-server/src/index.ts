import express from "express";
import jwt from "jsonwebtoken";
import cors from "cors";
import { JWT_SECRET } from "@repo/common-backend/config";
import { AuthMiddleware} from "./middleware";
import { CreateUserSchema , SignInSchema , CreateRoomSchema } from "@repo/common/types";
import { prisma } from "@repo/db/client";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/signup", async(req,res)=>{ 
    const parsedData = CreateUserSchema.safeParse(req.body);
    if(!parsedData.success){
        res.json({
            message:"Incorrect Inputs"
        });
        return;
    }
    try {
        const user =await prisma.user.create({
            data: {
                email: parsedData.data?.username,
                password: parsedData.data.password,
                name: parsedData.data.name
            }
        })
        res.json({
            userId: user.id
        })
    } catch (error) {
        res.status(411).json({
            message: "User already exists with this username"
        })  
    }
});

app.post("/signin",async(req,res)=>{ 
        
    const parsedData = SignInSchema.safeParse(req.body);
    if(!parsedData.success){
        res.json({
            message:"Incorrect Inputs"
        });
        return;
    }

    const user = await prisma.user.findFirst({
        where:{
            email: parsedData.data?.username,
            password: parsedData.data.password
        }
    })

    if(!user){
        res.status(403).json({
            message: "Not authorized"
        })
        return;
    }
    
    const userId = user?.id;

    const token = jwt.sign({
        userId
    },JWT_SECRET)

    res.json({
        token
    })
});

app.post("/room",AuthMiddleware , async(req,res)=>{    
    const parsedData = CreateRoomSchema.safeParse(req.body);
    if(!parsedData.success){
        res.json({
            message:"Incorrect Inputs"
        });
        return;
    }

    const userId = req.userId;

    try {
        const room = await prisma.room.create({
            data:{
                slug : parsedData.data.name,
                adminId: userId!
            }
        })
        res.json({
            roomId: room.id
        })
    } catch (error) {
            res.status(411).json({
            message: "Room already exists with this name"
        })
    }

}); 



app.get("/chats/:roomId", async (req,res) =>{
    const roomId = Number(req.params.roomId);
    const messages = await prisma.chat.findMany({
        where:{
            id: roomId
        },
        orderBy:{
            id: "desc"
        },
        take:500
    })

    res.json([
        messages
    ])
})

app.listen(3001);