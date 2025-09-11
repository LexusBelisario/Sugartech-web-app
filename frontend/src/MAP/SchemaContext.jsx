import React, { createContext, useContext, useState } from "react";

const SchemaContext = createContext();

export const SchemaProvider = ({ children }) => {
  const [schema, setSchema] = useState(null);

  return (
    <SchemaContext.Provider value={{ schema, setSchema }}>
      {children}
    </SchemaContext.Provider>
  );
};

export const useSchema = () => useContext(SchemaContext);
