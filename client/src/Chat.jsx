import { useContext, useEffect, useRef, useState } from "react"
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import {uniqBy} from "lodash";
import axios from "axios";
import Contact from "./Contact";

export default function Chat(){
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMsgText, setNewMsgText] =  useState('');
  const [messages, setMessages] = useState([]);
  const {username, id, setId, setUsername} = useContext(UserContext);
  //this is for autoscrolling when a messages is sent 
  const divUnderMessages = useRef();

  useEffect(()=>{
   connectToWs();
  }, [])

  function connectToWs() {
    const ws = new WebSocket('ws://localhost:4000');
    setWs(ws);
    ws.addEventListener('message', handleMessage);
    ws.addEventListener('close', () => {
      setTimeout(() => {
        console.log('Disconnected. Trying to reconnect...')
        connectToWs();
      }, 1000);
      
    });
  }
  function showOnlinePoeple(peopleArray) {
    const people = {};
    peopleArray.forEach(({userId, username}) => {
      people[userId] = username
    });
    setOnlinePeople(people);
  }

  function handleMessage(event) {
    const messageData = JSON.parse(event.data);
    //console.log(event, messageData);
    if('online' in messageData){
      showOnlinePoeple(messageData.online);
    } else if('text' in messageData){
      setMessages(prev => ([...prev, {...messageData}]));
      console.log(messages)
    }
  }

  function sendMsg(event){
    event.preventDefault();
    ws.send(JSON.stringify({
      recipient: selectedUserId,
      text: newMsgText,
    }));
    //emptying the text box after msg is sent
    setNewMsgText('');
    setMessages(prev => ([...prev,{
      text:newMsgText, 
      sender: id, 
      recipient: selectedUserId,
      _id:Date.now(),
    }]));
  }

  function logout(){
    axios.post('/logout').then(() => {
      setWs(null);
      setId(null);
      setUsername(null);
    })
  }

  //useeffect code will run whenever messages get updated.
  useEffect(() => {
    const div = divUnderMessages.current;
    if(div) {
      div.scrollIntoView({behavior:'smooth', block:'end'});
    }
  }, [messages]);

  useEffect(() => {
    if(selectedUserId)
      axios.get('/messages/'+selectedUserId).then(res => {
      setMessages(res.data);
    })
  }, [selectedUserId]);

  useEffect(() => {
    axios.get('/people').then(res => {
      const offlinePeopleArr = res.data
        .filter(p => p._id!==id)
        .filter(p => !Object.keys(onlinePeople).includes(p._id));
      
      const offlinePeople = {}
      offlinePeopleArr.forEach(p => {
        offlinePeople[p._id] = p;
      });
      setOfflinePeople(offlinePeople);
    })
    console.log(offlinePeople)
  },[onlinePeople])

  const onlinePeopleExOurName = {...onlinePeople};
  delete onlinePeopleExOurName[id];

  const msgsWithoutDupes = uniqBy(messages, '_id'); 

    return(
        <div className="flex h-screen">
          <div className="bg-white w-1/3 flex flex-col">
            <div className="flex-grow">
              <Logo/>
              {Object.keys(onlinePeopleExOurName).map(userId => (
                // eslint-disable-next-line react/jsx-key
                <Contact 
                  id={userId} 
                  isOnline = {true}
                  username={onlinePeopleExOurName[userId]} 
                  onClick={() => setSelectedUserId(userId)}
                  selected={userId === selectedUserId} />
              ))}
              {Object.keys(offlinePeople).map(userId => (
                // eslint-disable-next-line react/jsx-key
                <Contact 
                  id={userId} 
                  isOnline = {false}
                  username={offlinePeople[userId].username} 
                  onClick={() => setSelectedUserId(userId)}
                  selected={userId === selectedUserId} />
              ))}
            </div>
            <div className="p-2 text-center">
              <span className="mr-2 text-sm text-gray-600">Logged in as {username}</span>
              <button 
                onClick = {logout}
                className="text-sm bg-blue-200 border rounded-md py-1 px-2 text-gray-800">
                  Logout
              </button>
            </div>
          </div>
            <div className="flex flex-col bg-blue-200 w-2/3 p-2">
              <div className="flex-grow">
                {!selectedUserId && (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-gray-800">no selected person</div>
                  </div>
                )}
                {selectedUserId && (
                  //the below 2 divs are for 
                  //when a chat is being scrolled, the contacts to the left shouldn't scroll
                  <div className="relative h-full">
                    <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                    {msgsWithoutDupes.map(message => (
                       // eslint-disable-next-line react/jsx-key
                       <div className={(message.sender === id ? 'text-right':'text-left')}>
                         <div className={"text-left inline-block p-2 my-2 rounded-md text-sm "+(message.sender === id ? 'bg-blue-500 text-white':'bg-white text-grey-500')}>
                          {message.text}
                          </div>
                        </div>
                      ))}
                      <div ref={divUnderMessages}></div>
                    </div>
                  </div>
                )}
              </div>
              {selectedUserId && (
              <form className="flex gap-2" onSubmit={sendMsg}>
                <input type="text" 
                       value={newMsgText}
                       onChange={event => setNewMsgText(event.target.value)}
                       placeholder="Type your message here"
                       className="bg-white flex-grow border p-2 rounded-lg"/>
                <button type="submit" className="bg-blue-500 p-2 text-white rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                </button>
              </form>
              )}
            </div>
        </div>
    )
}