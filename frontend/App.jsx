import { Provider } from "react-redux";
import { store } from "./redux/store";
import Sidebar from "./components/SideBar";
import CircularButton from "./components/CircularButton";

const App = () => {
    return ( 
        <Provider store={store}>
            <CircularButton/>
            <Sidebar/>
        </Provider>
     );
}
 
export default App;