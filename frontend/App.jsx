import { Provider } from "react-redux";
import { store } from "./redux/store.jsx";
import Sidebar from "./components/SideBar.jsx";
import CircularButton from "./components/CircularButton.jsx";

const App = () => {
    return ( 
        <Provider store={store}>
            <CircularButton/>
            <Sidebar/>
        </Provider>
     );
}
 
export default App;