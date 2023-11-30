//EXPO SECURE STORE
import * as SecureStore from "expo-secure-store";

// check if guid exists and if mobile app is enabled
export const checkGuidAndSetNavigation = async () => {
  const guid = await SecureStore.getItemAsync("guid");
  const workerId = await SecureStore.getItemAsync("worker_id");
  try {
    if (guid && workerId) {
      //check if mobile app is enabled
      return "HomePage"
    } else {
      return "OnBoardPage"
    }
  } catch (error) {
    return "OnBoardPage"
  }
};
