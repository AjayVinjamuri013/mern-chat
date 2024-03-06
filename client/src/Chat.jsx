import { useContext, useEffect, useRef, useState } from "react"
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import {uniqBy} from "lodash";

export default function Chat(){
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMsgText, setNewMsgText] =  useState('');
  const [messages, setMessages] = useState([]);
  const {username, id} = useContext(UserContext);
  //this is for autoscrolling when a messages is sent 
  const divUnderMessages = useRef();

  useEffect(()=>{
    const ws = new WebSocket('ws://localhost:4000');
    setWs(ws);
    ws.addEventListener('message', handleMessage)
  }, [])

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
      id:Date.now(),
    }]));
  }

  //useeffect code will run whenever messages get updated.
  useEffect(() => {
    const div = divUnderMessages.current;
    if(div) {
      div.scrollIntoView({behavior:'smooth', block:'end'});
    }
  }, [messages]);

  const onlinePeopleExOurName = {...onlinePeople};
  delete onlinePeopleExOurName[id];

  const msgsWithoutDupes = uniqBy(messages, 'id'); 

    return(
        <div className="flex h-screen">
          <div className="bg-white w-1/3">
            <Logo/>
            {Object.keys(onlinePeopleExOurName).map(userId => (
              <div onClick={()=> setSelectedUserId(userId)} key={userId} 
                className={"border-b border-gray-950 flex items-center gap-2 cursor-pointer "+ (userId === selectedUserId ? 'bg-blue-50':'')}>
                {userId === selectedUserId && (
                  <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>
                )}
                <div className="flex gap-2 py-2 pl-4 items-center">
                  <Avatar username={onlinePeople[userId]} userId={userId}/>
                  <span>{onlinePeople[userId]}</span>
                </div>
              </div>
            ))}
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
                          Sender : {message.sender} <br />
                          my id:{id} <br />
                          {message.text} <br />
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