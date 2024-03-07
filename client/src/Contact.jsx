import Avatar from "./Avatar";

export default function Contact({id, username, onClick, selected, isOnline}){
    return (
        <div onClick={()=> onClick(id)} key={id} 
                className={"border-b border-gray-950 flex items-center gap-2 cursor-pointer "+ (selected ? 'bg-blue-50':'')}>
                {selected && (
                  <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>
                )}
                <div className="flex gap-2 py-2 pl-4 items-center">
                  <Avatar online={isOnline} username={username} userId={id}/>
                  <span>{username}</span>
                </div>
              </div>
    )
}