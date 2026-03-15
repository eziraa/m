import React from "react";

const Logo = () => {
  return (
    <pre className="text-[7px] font-mono text-black/60 dark:text-white/60   select-none leading-2">
      {`
  __  __      _ _         ____  _                   
 |  \\/  |    | | |       |  _ \\(_)                  
 | \\  / | ___| | | __ _  | |_) |_ _ __   __ _  ___  
 | |\\/| |/ _ \\ | |/ _\` | |  _ <| | '_ \\ / _\` |/ _ \\ 
 | |  | |  __/ | | (_| | | |_) | | | | | (_| | (_) |
 |_|  |_|\\___|_|_|\\__,_| |____/|_|_| |_|\\__, |\\___/ 
                                         __/ |      
                                         |___/       
`}
    </pre>
  );
};

export default Logo;
