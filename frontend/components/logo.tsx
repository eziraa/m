import React from "react";

const Logo = () => {
  return (
    <pre className="text-[8px] font-mono text-indigo-600 dark:text-indigo-400 select-none leading-2">
      {`
  ____            _     _     ____  _                   
 | __ )  ___  ___| |__ (_)   | __ )(_)_ __   __ _  ___  
 |  _ \\ / _ \\/ __| '_ \\| |   |  _ \\| | '_ \\ / _\` |/ _ \\ 
 | |_) |  __/\\__ \\ | | | |   | |_) | | | | | (_| | (_) |
 |____/ \\___||___/_| |_|_|   |____/|_|_| |_|\\__, |\\___/ 
                                           |___/        
`}
    </pre>
  );
};

export default Logo;
