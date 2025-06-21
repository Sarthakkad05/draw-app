import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/common-backend/config";
import { prisma } from "@repo/db/client";

const wss = new WebSocketServer({port:8000});

interface User{
    rooms: string[],
    ws: WebSocket,
    userId: string
}

const users : User[] = [];

//check if user is authenticated
function checkUser(token:string): string | null{
    try {
    const decoded = jwt.verify(token , JWT_SECRET);

    if(typeof decoded == "string"){
        return null;
    }

    if(!decoded || !decoded.userId){
        return null;
    }

    return decoded.userId ;
    } catch (error) {
        return null;
    }


}

wss.on("connection",function connection(ws,request){
    //get url from params
    const url = request.url;
    if(!url){
        return;
    }
    const queryPrams = new URLSearchParams(url?.split('?')[1]);
    const token = queryPrams.get('token') || "";
    const userId = checkUser(token);

    if(userId == null){
        ws.close();
        return
    }

    //if useriD => push to global users array
    users.push({
        userId,
        rooms:[],
        ws
    })

    ws.on("message" , async function message(data){
        const parsedData = JSON.parse(data as unknown as string);

        //join room
        if(parsedData.type == "join_room"){
            const user = users.find(x => x.ws === ws);
            user?.rooms.push(parsedData.userId);
        }

        //leave room
        if(parsedData.type == "leave_room"){
            const user = users.find(x => x.ws === ws);
            if(!user){
                return;
            }
            user.rooms = user.rooms.filter(x => x === parsedData.room)
        }

        //send message to roomId
        if(parsedData.type == "chat"){
            const message = parsedData.message;
            const roomId = parsedData.roomId;

            await prisma.chat.create({
                data:{                
                    roomId,
                    userId,
                    message}
                })

            users.forEach(user => {
                if(user.rooms.includes(roomId)){
                    user.ws.send(JSON.stringify({
                        type: "chat",
                        message,
                        roomId
                    }))
                }
            })
        }
    });
});