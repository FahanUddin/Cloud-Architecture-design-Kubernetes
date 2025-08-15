import React, { useEffect, useState } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CanvasDrawing from './component/CanvasDrawing.jsx';
import io from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import WhiteboardContext from './contexts/WhiteboardContext.jsx';

const server = "http://192.168.1.134:30105";
const connectionOptions = {
  "force new connection": true,
  reconnectionAttempts: "Infinity",
  timeout: 10000,
  transports: ["websocket"]
}

const socket = io(server, connectionOptions);

function App() {
  // References:
  // https://github.com/rayancrasta/Realtime-Collaborative-Whiteboard
  // https://www.geeksforgeeks.org/how-to-create-virtual-whiteboard-using-javascript-and-tailwind/
  // https://codesandbox.io/p/devbox/tailwind-react-tooltip-with-arrow-dfr22j?file=%2Fsrc%2Fstyles.css%3A5%2C1-8%2C1
  // https://github.com/Khanak21/Whiteboard

  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // get notified when a new user has joined
    socket.on("userJoinedSuccess", (data) => {
      if (data.success) {
        // toast(`${data.user_id} joined the board`, {
        //   position: "top-left",
        //   autoClose: 2000,
        //   hideProgressBar: false,
        //   closeOnClick: true,
        //   pauseOnHover: true,
        //   draggable: true,
        //   progress: undefined,
        //   theme: "light",
        // });
        setUser(data.user_id);
        console.log("User joined whiteboard sucessfully:", data);
      }
      else {
        console.log("Something went wrong!");
      }
    });

    // get information about all current active users
    socket.on("allActiveUsers", data => {
      setUsers(data);
      console.log(data);
    });

    // get notified when a user has disconnected
    socket.on("userDisconnected", (data) => {
      // toast(`${data.user_id} has left the board.`, {
      //   position: "top-left",
      //   autoClose: 2000,
      //   hideProgressBar: false,
      //   closeOnClick: true,
      //   pauseOnHover: true,
      //   draggable: true,
      //   progress: undefined,
      //   theme: "light",
      // });
      setUsers(data);
      console.log("A user has disconnected", data);
    });
  }, []);

  return (
    <WhiteboardContext.Provider value={{
      socket: socket,
      user: user,
      users: users,
    }}>
      <ToastContainer />
      <Router>
        <Routes>
          <Route exact path="/" element={<CanvasDrawing />} />
        </Routes>
      </Router>
    </WhiteboardContext.Provider>
  );
}

export default App;