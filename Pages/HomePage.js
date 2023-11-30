import React, { useState, useRef, useEffect, useContext } from "react";
import {
  StyleSheet,
  BackHandler,
  View,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
  NativeEventEmitter,
  Text,
  Dimensions,
} from "react-native";

//firebise cloud messaging
import messaging from "@react-native-firebase/messaging";

//USE IF FOCUSED UNMOUNT SCREEN WHEN NOT SEEN
import { useIsFocused } from "@react-navigation/native";

//EXPO HAPTICS
import * as Haptics from "expo-haptics";

//EXPO STATUS BAR
import { StatusBar } from "expo-status-bar";

//CONTEXT
import { UserContext } from "../context/ScannedContext";
import { LoggedContext } from "../context/LoggedContext";

//KeyboardAwareScrollView
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

//REGULA
import DocumentReader, {
  Enum,
  DocumentReaderCompletion,
  DocumentReaderScenario,
  RNRegulaDocumentReader,
  ScenarioIdentifier,
} from "@regulaforensics/react-native-document-reader-api";

//RNFS (READ FILE FROM BUNDLE)
import * as RNFS from "react-native-fs";

//STATIC
import { ColorPrimary, ColorPrimaryGradientOne } from "../Static/static";

//REACT NATIVE WEB VIEW
import { WebView } from "react-native-webview";
//EXPO SECURE STORE
import * as SecureStore from "expo-secure-store";
//NAVIGATION
import { useNavigation, useFocusEffect } from "@react-navigation/native";
//COMPONENTS
import ScanButton from "../Components/ScanButton";
import ShowScannedData from "../Components/ShowScannedData";

//FONT
import {
  useFonts,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

const eventManager = new NativeEventEmitter(RNRegulaDocumentReader);

//LICENSE LOCATION
var licPath =
  Platform.OS === "ios"
    ? RNFS.MainBundlePath + "/regula.license"
    : "regula.license";
//READ LICENSE (IOS/ANDROID)
var readFile = Platform.OS === "ios" ? RNFS.readFile : RNFS.readFileAssets;

const HomePage = () => {
  //LOAD FONTS
  let [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  //IS FOCUSED HOOK
  const isFocused = useIsFocused();

  //USER CONTEXT
  const { userData, setUserData } = useContext(UserContext);
  const { setIsUserLoggedIn, redirectPush, setRedirectPush } =
    useContext(LoggedContext);

  const [isScanningAllowed, setIsScanningAllowed] = useState(true);

  //DECLARATIONS
  const [urlState, setUrlState] = useState("");
  const [backButtonEnabled, setBackButtonEnabled] = useState(false);
  const [showScanButton, setShowScanButton] = useState(false);
  const [isDatabseConnected, setIsDatabseConnected] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  const [isPushExecuted, setIsPushExecuted] = useState(false);

  //SHOW FULL PAGE MODAL AFTER REGULA SCAN
  const [showScanInfo, setShowScanInfo] = useState(false);

  const WEBVIEW = useRef(null);

  async function prepareRegula() {
    if (isPushExecuted) {
      return;
    }
    eventManager.addListener("completionEvent", (e) =>
      handleCompletion(DocumentReaderCompletion.fromJson(JSON.parse(e["msg"])))
    );
    DocumentReader.prepareDatabase(
      "Full",
      (respond) => {
        readFile(licPath, "base64")
          .then((res) => {
            DocumentReader.initializeReader(
              {
                license: res,
              },
              (respond) => {
                setIsDatabseConnected(true);
              },
              (error) => console.log(error)
            );
          })
          .catch((error) => {
            console.log("Error reading the license");
          });
      },
      (error) => {
        Alert.alert("Error", "Error initialzing Regula document scanner sdk", [
          { text: "OK", onPress: () => true },
        ]);
      }
    );
  }

  // useEffect(() => {
  //   const scanning_avaliable = async () => {
  //     const worker_id = await SecureStore.getItemAsync("worker_id");
  //     const worker_id_quoteless = worker_id.replace(`"`, ``).replace(`"`, ``);
  //     //get user guid from local storage
  //     const user_guid = await SecureStore.getItemAsync("user_guid");

  //     await fetch(
  //       `https://api.my-rent.net/mcm/check_for_scaning?worker_id=${worker_id_quoteless}`,
  //       {
  //         headers: {
  //           user_guid: user_guid.replace(`"`, ``).replace(`"`, ``),
  //         },
  //       }
  //     )
  //       .then((response) => response.text())
  //       .then((data) => {
  //         var mobile = data.slice(19, 20);
  //         if (mobile === "Y") {
  //           setIsScanningAllowed(true);
  //         } else {
  //           setIsScanningAllowed(false);
  //         }
  //       })
  //       .catch((err) => console.log(err));
  //   };

  //   scanning_avaliable();
  // }, []);

  //INITIALIZE REGULA
  useEffect(() => {
    prepareRegula();
  }, []);

  //HANDLE COMPLETION
  function handleCompletion(completion) {
    if (completion.action === Enum.DocReaderAction.COMPLETE) {
      handleResults(completion.results);
    }
  }

  function handleResults(results) {
    // console.log(results);

    results.textFieldValueByType(
      Enum.eVisualFieldType.FT_DATE_OF_BIRTH,
      (value) => {
        setUserData((existingValues) => ({
          ...existingValues,
          birthDate: value,
        }));
      },
      (error) => console.log(error)
    );

    //name
    results.textFieldValueByType(
      Enum.eVisualFieldType.FT_GIVEN_NAMES,
      (value) => {
        setUserData((existingValues) => ({
          ...existingValues,
          name: value,
        }));
      },
      (error) => console.log(error)
    );

    //surname
    results.textFieldValueByType(
      Enum.eVisualFieldType.FT_SURNAME,
      (value) => {
        setUserData((existingValues) => ({
          ...existingValues,
          surname: value,
        }));
      },
      (error) => console.log(error)
    );

    //gender
    results.textFieldValueByType(
      Enum.eVisualFieldType.FT_SEX,
      (value) => {
        setUserData((existingValues) => ({
          ...existingValues,
          gender: value,
        }));
      },
      (error) => console.log(error)
    );

    //nationality
    results.textFieldValueByType(
      Enum.eVisualFieldType.FT_NATIONALITY,
      (value) => {
        setUserData((existingValues) => ({
          ...existingValues,
          country: value,
        }));
      },
      (error) => console.log(error)
    );

    //documentId
    results.textFieldValueByType(
      Enum.eVisualFieldType.FT_DOCUMENT_NUMBER,
      (value) => {
        setUserData((existingValues) => ({
          ...existingValues,
          documentId: value,
        }));
      },
      (error) => console.log(error)
    );

    //document type
    results.textFieldValueByType(
      Enum.eVisualFieldType.FT_DOCUMENT_CLASS_CODE,
      (value) => {
        setUserData((existingValues) => ({
          ...existingValues,
          documentType: value,
        }));
      },
      (error) => console.log(error)
    );

    // citizenship
    results.textFieldValueByType(
      Enum.eVisualFieldType.FT_NATIONALITY,
      (value) => {
        setUserData((existingValues) => ({
          ...existingValues,
          citizenship: value,
        }));
      },
      (error) => console.log(error)
    );

    results.textFieldValueByType(
      Enum.eVisualFieldType.FT_DATE_OF_EXPIRY,
      (value) => {
        setUserData((existingValues) => ({
          ...existingValues,
          exprirationDate: value,
        }));
      },
      (error) => console.log(error)
    );

    setUserData((existingValues) => ({
      ...existingValues,
      originalData: results.textResult,
    }));

    setShowScanInfo(true);
    setShowScanButton(false);
  }

  //ON SCAN BUTTON PRESS
  const onScanButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    DocumentReader.setConfig(
      {
        functionality: {
          videoCaptureMotionControl: true,
        },
        customization: {
          showResultStatusMessages: true,
          showStatusMessages: true,
        },
        processParams: {
          scenario: ScenarioIdentifier.SCENARIO_MRZ,
        },
      },
      (e) => {},
      (error) => {}
    );

    DocumentReader.showScanner(
      (s) => console.log(s),
      (e) => {}
    );
  };

  //ON CANCEL BUTTON PRESS
  const onCancelButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowScanInfo(false);
    const extractRentId = currentUrl.split("?")[1].split("=")[1];
    const redirectTo = `window.location="/#rents/messages?rent_id=${extractRentId}"; window.location = "/#rents/guests?rent_id=${extractRentId}"`;
    WEBVIEW.current.injectJavaScript(redirectTo);
  };

  //ON MAIN SCREEN HANDLE IF THE BACK BUTTON IS CLICKED TO EXIT APP
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        Alert.alert("Hold on!", "Are you sure you want to Exit?", [
          {
            text: "Cancel",
            onPress: () => null,
            style: "cancel",
          },
          { text: "YES", onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      };

      BackHandler.addEventListener("hardwareBackPress", onBackPress);

      return () =>
        BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [])
  );

  async function getGuidFromExpoSecureStore() {
    if (isPushExecuted) {
      return;
    }
    try {
      const guid = await SecureStore.getItemAsync("guid");
      const worker_id = await SecureStore.getItemAsync("worker_id");
      //GENERATING URL
      setUrlState(
        `https://m.my-rent.net/?id=${guid.replace(`"`, ``).replace(`"`, ``)}`
      );
      //ADDING WORKER_ID TO USER CONTEXT
      setUserData((existingValues) => ({
        ...existingValues,
        workerId: worker_id.replace(`"`, ``).replace(`"`, ``),
      }));
    } catch (error) {
      console.log("Getting guid and worker id from expo store error");
    }
  }

  //GETTING GUID AND WORKER_ID FROM EXPO SECURE STORE
  useEffect(() => {
    getGuidFromExpoSecureStore();
  }, []);

  //logout
  const setUserLoggedOut = async (worker_id, token) => {
    //get user guid from local storage
    const user_guid = await SecureStore.getItemAsync("user_guid");
    const is_logged_in = "N";
    fetch(
      `https://api.my-rent.net/mcm/update_login_state?worker_id=${worker_id}&key=${token}&is_logged_in=${is_logged_in}`,
      {
        headers: {
          user_guid: user_guid.replace(`"`, ``).replace(`"`, ``),
        },
      }
    ).then(() => {
      deleteDataFromStorage();
    });
  };

  const deleteDataFromStorage = async () => {
    SecureStore.deleteItemAsync("user_guid")
      .then(() => {
        SecureStore.deleteItemAsync("guid");
      })
      .then(async () => {
        SecureStore.deleteItemAsync("worker_id");
        await new Promise((res) => setTimeout(res, 100));
        setIsUserLoggedIn(false);
      });
  };

  //Initialize push notifications
  useEffect(() => {
    if (requestUserPermission()) {
      // return fcm token for the device
      messaging()
        .getToken()
        .then(async (token) => {
          // console.log(token);
        });
    } else {
      console.log("Failed token status", authStatus);
    }

    //check whether an initail app is running
    messaging()
      .getInitialNotification()
      .then(async (remoteMessage) => {
        setIsPushExecuted(true);
        handleNotification(remoteMessage);
      });

    //asume a message-notification contains a type property in data payload of the screen to open
    messaging().onNotificationOpenedApp(async (remoteMessage) => {
      setIsPushExecuted(true);
      handleNotification(remoteMessage);
    });

    //background handler
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      setIsPushExecuted(true);
      handleNotification(remoteMessage);
    });

    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      setIsPushExecuted(true);
      handleNotification(remoteMessage, true);
    });

    return unsubscribe;
  }, [isDatabseConnected, urlState, WEBVIEW.current]);

  async function requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      // console.log("Authorization status:", authStatus);
    }
  }

  //handle push notification if user is in app or out of the app
  const handleNotification = async (remoteMessage, is_user_in_app = false) => {
    const app = await SecureStore.getItemAsync("app");
    if (remoteMessage && is_user_in_app === true) {
      if (app.replace('"', "").replace('"', "") === "worker") {
        Alert.alert(
          remoteMessage.notification.title,
          remoteMessage.notification.body,
          [
            {
              text: "Cancel",
              onPress: () => null,
              style: "cancel",
            },
            {
              text: "Go",
              onPress: () =>
                reddirectToScreen(
                  "https://m.my-rent.net/#rents/messages?rent_id=" +
                    remoteMessage.data.rent_id,
                  "https://m.my-rent.net/#edit?rent_id=" +
                    remoteMessage.data.rent_id
                ),
            },
          ]
        );
      }
    }
    //WHEN USER IS NOT IN APP
    else if (remoteMessage && is_user_in_app === false) {
      if (app.replace('"', "").replace('"', "") === "worker") {
        prepareRegula();
        getGuidFromExpoSecureStore();
        console.log(urlState);
        console.log(isDatabseConnected);
        if (!isDatabseConnected || (urlState === "" && !WEBVIEW.current)) {
          return;
        }
        //check which type of notifications is it
        if (remoteMessage.data.type === "message") {
          reddirectToScreen(
            "https://m.my-rent.net/#rents/messages?rent_id=" +
              remoteMessage.data.rent_id,
            "https://m.my-rent.net/#edit?rent_id=" + remoteMessage.data.rent_id
          );
        } else if (
          remoteMessage.data.type === "rent_change" ||
          remoteMessage.data.type === "rent_add"
        ) {
          reddirectToScreen(
            "https://m.my-rent.net/#rents/messages?rent_id=" +
              remoteMessage.data.rent_id,
            "https://m.my-rent.net/#edit?rent_id=" + remoteMessage.data.rent_id
          );
        }
      }
    }
  };

  const reddirectToScreen = (first_url, second_url) => {
    const redirectTo = `window.location="${first_url}"; window.location = "${second_url}"`;
    WEBVIEW.current.injectJavaScript(redirectTo);
  };
  //DELETING GUID ON LOGOUT
  async function deleteGuid() {
    const worker_id = await SecureStore.getItemAsync("worker_id");
    const token = await SecureStore.getItemAsync("push_token");
    const worker_id_quoteless = worker_id.replace(`"`, ``).replace(`"`, ``);
    const token_quoteless = token.replace(`"`, ``).replace(`"`, ``);
    // const user_guid_qless = user_guid.replace(`"`, `"`).replace(`"`, ``);

    setUserLoggedOut(worker_id_quoteless, token_quoteless);
  }

  // WEBVIEW NAVIGATION STATE CHANGE LISTENER && TRACE URL FROM WEBVIEW
  function onNavigationStateChange(navState) {
    console.log(navState.url);
    setBackButtonEnabled(navState.canGoBack);
    setCurrentUrl(navState.url);
    //TRACE URL FROM WEBVIEW
    //IS RESERVATION CLICKED SHOW SCAN BUTTON THAT STARTS MRT SCANNER
    // console.log(navState.url);
    if (navState.url.includes("?rent_id=")) {
      var nav_url = navState.url.split("?rent_id=");
    }
    if (nav_url === undefined) {
      nav_url = "0";
    }
    if (isScanningAllowed) {
      if (
        navState.url.split("?")[0]
          ? navState.url.split("?")[0] === "https://m.my-rent.net/#edit"
          : navState.url === "https://m.my-rent.net/#edit"
      ) {
        if (navState.url.split("?")[1]) {
          const extractRentId = navState.url.split("?")[1].split("=")[1];
          setUserData((existingValues) => ({
            ...existingValues,
            rentId: extractRentId,
          }));
        }
        setShowScanButton(true);
      } else if (nav_url[0] === "https://m.my-rent.net/#rents/guests") {
        setUserData((existingValues) => ({
          ...existingValues,
        }));
        setShowScanButton(true);
      } else {
        setShowScanButton(false);
      }
    }
    if (
      navState.url === urlState + "#" ||
      navState.url == "https://m.my-rent.net/#"
    ) {
      deleteGuid();
    }
  }

  // REFRESH TO SEE ADDED USER
  function openGuestList() {
    const extractRentId = currentUrl.split("?")[1].split("=")[1];
    const redirectTo = `window.location="/#rents/messages?rent_id=${extractRentId}"; window.location = "/#rents/guests?rent_id=${extractRentId}"`;
    WEBVIEW.current.injectJavaScript(redirectTo);
  }

  //HANDLE GO BACK BUTTON
  useEffect(() => {
    // Handle back event
    function backHandler() {
      if (backButtonEnabled) {
        WEBVIEW.current.goBack();
        return true;
      }
    }

    // Subscribe to back state vent
    BackHandler.addEventListener("hardwareBackPress", backHandler);

    // Unsubscribe
    return () =>
      BackHandler.removeEventListener("hardwareBackPress", backHandler);
  }, [backButtonEnabled]);

  function IndicatorLoadingView() {
    return (
      <ActivityIndicator
        color={ColorPrimary}
        size="large"
        style={styles.indicatorStyle}
      />
    );
  }

  return isFocused ? (
    <>
      {Platform.OS === "ios" ? (
        <SafeAreaView
          style={{
            flex: 0,
            backgroundColor:
              urlState && isDatabseConnected
                ? ColorPrimaryGradientOne
                : "white",
          }}
        />
      ) : null}
      <SafeAreaView
        style={{
          zIndex: 6,
          flex: 1,
          backgroundColor: "white",
        }}
      >
        {Platform.OS === "android" && (
          <View
            style={{ paddingTop: 48, backgroundColor: ColorPrimaryGradientOne }}
          />
        )}
        {urlState && isDatabseConnected ? (
          <>
            <View style={{ display: showScanInfo ? "none" : "flex", flex: 1 }}>
              <WebView
                startInLoadingState={true}
                ref={WEBVIEW}
                onNavigationStateChange={onNavigationStateChange}
                source={{ uri: urlState }}
                allowsBackForwardNavigationGestures
                javaScriptEnabled={true}
                domStorageEnabled={true}
                renderLoading={IndicatorLoadingView}
              />
            </View>
            {showScanButton && (
              <View style={styles.scanButtonContainer}>
                <ScanButton onPress={onScanButtonPress} />
              </View>
            )}
            {showScanInfo && (
              <View style={styles.scanInfoContainer}>
                <View style={styles.scannedDataContainer}>
                  <Text style={styles.headerText}>Scanned Data</Text>
                </View>
                <KeyboardAwareScrollView
                  style={{
                    backgroundColor: "transparent",
                    flex: 1,
                    width: "100%",
                  }}
                >
                  <ShowScannedData
                    openGuestList={openGuestList}
                    userData={userData}
                    setUserData={setUserData}
                    setShowScanInfo={setShowScanInfo}
                    onScanButtonPress={onScanButtonPress}
                    onCancelButtonPress={onCancelButtonPress}
                  />
                </KeyboardAwareScrollView>
              </View>
            )}
          </>
        ) : (
          <View
            style={{
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <StatusBar style="dark" />
            {fontsLoaded && (
              <Text style={styles.loadingText}>Setting up your app...</Text>
            )}
            <ActivityIndicator size="large" color="#292a44" />
          </View>
        )}
      </SafeAreaView>
    </>
  ) : null;
};

const styles = StyleSheet.create({
  bottomTabBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    justifyContent: "space-around",
    flexDirection: "row",
    elevation: 5,
    backgroundColor: "white",
    paddingTop: 4,
    height: 64,
    zIndex: 99,
    shadowColor: "black",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  loadingText: {
    textAlign: "center",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#292a44",
    marginBottom: 12,
    width: "100%",
  },
  scanButtonContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 120 : 90,
    right: 20,
    elevation: 4,
  },
  indicatorStyle: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scanInfoContainer: {
    flex: 1,
    backgroundColor: "white",
    width: "100%",
    paddingHorizontal: 16,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    zIndex: 6,
  },
  cardContainer: {
    backgroundColor: "white",
    width: "100%",
    alignItems: "center",
    height: "auto",
    justifyContent: "flex-start",
    elevation: 7,
    shadowColor: "#171717",
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderRadius: 8,
  },
  btnLogin: {
    marginTop: 16,
    marginHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 4,
    elevation: 8,
    shadowColor: "#171717",
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    width: 104,
  },
  loginText: {
    textAlign: "center",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  scannedDataContainer: {
    width: "100%",
    marginBottom: 16,
    marginTop: 24,
  },
  headerText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 24,
    marginBottom: 16,
  },
  buttonsContainer: {
    display: "flex",
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
});

export default HomePage;
