import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import * as WebBrowser from "expo-web-browser";
import { StyleSheet } from "react-native";
import useSWR, { useSWRConfig } from "swr";

import {
  StackParamList,
  CardsStackParamList,
  ReceiptsStackParamList,
  TabParamList,
  SettingsStackParamList,
} from "./lib/NavigatorParamList";
import { PaginatedResponse } from "./lib/types/HcbApiObject";
import Invitation from "./lib/types/Invitation";
import { useIsDark } from "./lib/useColorScheme";
import CardPage from "./pages/card";
import CardsPage from "./pages/cards";
import Home from "./pages/index";
import InvitationPage from "./pages/Invitation";
import OrganizationPage from "./pages/organization";
import AccountNumberPage from "./pages/organization/AccountNumber";
import OrganizationDonationPage from "./pages/organization/Donation";
import ProcessDonationPage from "./pages/organization/ProcessDonation";
import OrganizationSettingsPage from "./pages/organization/Settings";
import TransferPage from "./pages/organization/transfer";
import ReceiptsPage from "./pages/Receipts";
import RenameTransactionPage from "./pages/RenameTransaction";
import About from "./pages/settings/About";
import AppIconSelector from "./pages/settings/AppIconSelector";
import DeepLinkingSettings from "./pages/settings/DeepLinkingSettings";
import SettingsPage from "./pages/settings/Settings";
import Tutorials from "./pages/settings/Tutorials";
import TransactionPage from "./pages/Transaction";
import { palette } from "./theme";

// import OrganizationTitle from "./components/organizations/OrganizationTitle";

const Stack = createNativeStackNavigator<StackParamList>();
const CardsStack = createNativeStackNavigator<CardsStackParamList>();
const ReceiptsStack = createNativeStackNavigator<ReceiptsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const Tab = createBottomTabNavigator<TabParamList>();

export default function Navigator() {
  const { data: missingReceiptData } = useSWR<PaginatedResponse<never>>(
    `user/transactions/missing_receipt`,
  );
  const { data: invitations } = useSWR<Invitation[]>(`user/invitations`);

  const { colors: themeColors } = useTheme();

  const { mutate } = useSWRConfig();
  const isDark = useIsDark();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>["name"];

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Cards") {
            iconName = focused ? "card" : "card-outline";
          } else if (route.name === "Receipts") {
            iconName = focused ? "receipt" : "receipt-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          } else {
            throw new Error("unknown route name");
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        // headerStyle: { backgroundColor: themeColors.background },
        headerShown: false,
        tabBarStyle: { position: "absolute" },
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => (
          <BlurView
            tint={isDark ? "dark" : "light"}
            intensity={100}
            style={StyleSheet.absoluteFill}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        options={{ tabBarBadge: invitations?.length || undefined }}
      >
        {() => (
          <Stack.Navigator
            screenOptions={{
              headerLargeTitleShadowVisible: false,
            }}
          >
            <Stack.Screen
              name="Organizations"
              component={Home}
              options={{
                title: "Home",
                headerLargeTitle: true,
                headerRight: () => (
                  <Ionicons.Button
                    name="add-circle-outline"
                    backgroundColor="transparent"
                    size={24}
                    underlayColor={themeColors.card}
                    color={palette.primary}
                    iconStyle={{ marginRight: 0 }}
                    onPress={() => {
                      WebBrowser.openBrowserAsync(
                        "https://hackclub.com/hcb/apply",
                        {
                          presentationStyle:
                            WebBrowser.WebBrowserPresentationStyle.POPOVER,
                          controlsColor: palette.primary,
                          dismissButtonStyle: "cancel",
                        },
                      ).then(() => {
                        mutate("user/organizations");
                        mutate("user/invitations");
                      });
                    }}
                  />
                ),
              }}
            />
            <Stack.Screen
              name="Invitation"
              component={InvitationPage}
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Event"
              options={({ route }) => ({
                // headerTitle: () => <OrganizationTitle {...route.params} />,
                title: route.params.organization?.name || "Organization",
                headerBackTitle: "Back",
              })}
              component={OrganizationPage}
            />
            <Stack.Screen
              name="AccountNumber"
              component={AccountNumberPage}
              options={{ presentation: "modal", title: "Account Details" }}
            />
            <Stack.Screen
              name="OrganizationSettings"
              component={OrganizationSettingsPage}
              options={{
                headerBackTitle: "Back",
                title: "Manage Organization",
              }}
            />
            <Stack.Screen
              name="OrganizationDonation"
              component={OrganizationDonationPage}
              options={{
                headerBackTitle: "Back",
                title: "Collect Donations",
              }}
            />
            <Stack.Screen
              name="ProcessDonation"
              component={ProcessDonationPage}
              options={{ presentation: "modal", title: "Process Donation" }}
            />
            <Stack.Screen
              options={{ headerBackTitle: "Back" }}
              name="Transaction"
              component={TransactionPage}
            />
            <Stack.Screen
              name="RenameTransaction"
              component={RenameTransactionPage}
              options={{
                presentation: "modal",
                title: "Edit Transaction Description",
              }}
            />
            <Stack.Screen
              name="Transfer"
              component={TransferPage}
              options={{
                presentation: "modal",
                title: "Send Transfer",
              }}
            />
          </Stack.Navigator>
        )}
      </Tab.Screen>
      <Tab.Screen name="Cards" options={{ tabBarLabel: "Cards" }}>
        {() => (
          <CardsStack.Navigator>
            <CardsStack.Screen
              name="CardList"
              component={CardsPage}
              options={{ title: "Cards" }}
            />
            <CardsStack.Screen
              name="Card"
              component={CardPage}
              options={() => ({
                title: "Card",
              })}
            />
            <Stack.Screen
              options={{ headerBackTitle: "Back" }}
              name="Transaction"
              component={TransactionPage}
            />
            <Stack.Screen
              name="RenameTransaction"
              component={RenameTransactionPage}
              options={{
                presentation: "modal",
                title: "Edit Transaction Description",
              }}
            />
          </CardsStack.Navigator>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Receipts"
        options={{
          tabBarBadge: missingReceiptData?.total_count || undefined,
        }}
      >
        {() => (
          <ReceiptsStack.Navigator>
            <ReceiptsStack.Screen
              name="MissingReceiptList"
              options={{ title: "Missing Receipts" }}
              component={ReceiptsPage}
            />
          </ReceiptsStack.Navigator>
        )}
      </Tab.Screen>
      <Tab.Screen name="Settings" options={{ headerShown: false }}>
        {() => (
          <SettingsStack.Navigator>
            <SettingsStack.Screen
              name="SettingsMain"
              component={SettingsPage}
              options={{ title: "Settings" }}
            />
            <SettingsStack.Screen
              name="AppIconSelector"
              component={AppIconSelector}
              options={{ title: "App Icon" }}
            />
            <SettingsStack.Screen
              name="DeepLinkingSettings"
              component={DeepLinkingSettings}
              options={{ title: "Deep Linking" }}
            />
            <SettingsStack.Screen
              name="Tutorials"
              component={Tutorials}
              options={{ title: "Tutorials" }}
            />
            <SettingsStack.Screen
              name="About"
              component={About}
              options={{ title: "About" }}
            />
          </SettingsStack.Navigator>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
