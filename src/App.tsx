import { FC } from "react";
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom";
import { Root } from "./Root";
import { MapComponent } from "./Map";
import { Error404 } from "./Error404";

export const App: FC = () => {
  const router = createBrowserRouter(
      createRoutesFromElements(
          <Route path="/" element={<Root/>}>
              <Route index element={<MapComponent/>}/>
              <Route path="*" element={<Error404/>}/>
          </Route>
      )
  );

  return (
      <div className="App">
          <RouterProvider router={router}/>
      </div>
  )
}