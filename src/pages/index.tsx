import { Ionicons } from "@expo/vector-icons";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useEffect, useState, useRef } from "react";
import {
  FlatList,
  Text,
  View,
  ActivityIndicator,
  TouchableHighlight,
  ViewProps,
  StyleSheet,
  useColorScheme,
  RefreshControl,
} from "react-native";
import useSWR, { preload, useSWRConfig } from "swr";

import Transaction from "../components/Transaction";
import { StackParamList } from "../lib/NavigatorParamList";
import usePinnedOrgs from "../lib/organization/usePinnedOrgs";
import { PaginatedResponse } from "../lib/types/HcbApiObject";
import Invitation from "../lib/types/Invitation";
import Organization, { OrganizationExpanded } from "../lib/types/Organization";
import ITransaction from "../lib/types/Transaction";
import { useIsDark } from "../lib/useColorScheme";
import { palette } from "../theme";
import { orgColor, renderMoney } from "../util";

function EventBalance({ balance_cents }: { balance_cents?: number }) {
  return balance_cents !== undefined ? (
    <Text style={{ color: palette.muted, fontSize: 16, marginTop: 5 }}>
      {renderMoney(balance_cents)}
    </Text>
  ) : (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
        gap: 1,
      }}
    >
      <Text style={{ color: palette.muted, fontSize: 16 }}>$</Text>
      <View
        style={{
          backgroundColor: palette.slate,
          width: 100,
          height: 12,
          borderRadius: 4,
        }}
      />
    </View>
  );
}

function Event({
  event,
  hideBalance = false,
  onPress,
  onHold,
  style,
  invitation,
  showTransactions = false,
  pinned = false,
}: ViewProps & {
  event: Organization;
  hideBalance?: boolean;
  showTransactions?: boolean;
  pinned?: boolean;
  invitation?: Invitation;
  onPress?: () => void;
  onHold?: () => void;
}) {
  const { data } = useSWR<OrganizationExpanded>(
    hideBalance ? null : `organizations/${event.id}`,
  );
  const { data: transactions, isLoading: transactionsIsLoading } = useSWR<
    PaginatedResponse<ITransaction>
  >(showTransactions ? `organizations/${event.id}/transactions?limit=5` : null);

  const { colors: themeColors } = useTheme();

  const color = orgColor(event.id);
  const isDark = useIsDark();

  return (
    <TouchableHighlight
      onPress={onPress}
      onLongPress={onHold}
      underlayColor={themeColors.background}
      activeOpacity={0.7}
    >
      <View
        style={StyleSheet.compose(
          {
            backgroundColor: themeColors.card,
            marginBottom: 16,
            borderRadius: 10,
          },
          style,
        )}
      >
        {pinned && (
          <Text
            style={{
              position: "absolute",
              top: -10,
              right: -10,
              fontSize: 20,
            }}
          >
            📌
          </Text>
        )}
        <View
          style={{ flexDirection: "row", alignItems: "center", padding: 16 }}
        >
          {event.icon ? (
            <Image
              source={{ uri: event.icon }}
              cachePolicy="disk"
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                marginRight: 16,
              }}
            />
          ) : (
            <View
              style={{
                borderRadius: 8,
                width: 40,
                height: 40,
                backgroundColor: color,
                marginRight: 16,
              }}
            ></View>
          )}
          <View
            style={{
              flexDirection: "column",
              flex: 1,
            }}
          >
            {invitation && invitation.sender && (
              <Text style={{ color: palette.muted, marginBottom: 3 }}>
                <Text style={{ fontWeight: "600" }}>
                  {invitation.sender.name}
                </Text>{" "}
                invited you to
              </Text>
            )}
            <Text
              numberOfLines={2}
              style={{
                color: themeColors.text,
                fontSize: 20,
                fontWeight: "600",
              }}
            >
              {event.name}
            </Text>
            {data?.playground_mode && (
              <View
                style={{
                  backgroundColor: isDark ? "#283140" : "#348EDA",
                  paddingVertical: 4,
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  alignSelf: "flex-start",
                  marginVertical: 4,
                }}
              >
                <Text
                  style={{
                    color: isDark ? "#248EDA" : "white",
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                >
                  Playground Mode
                </Text>
              </View>
            )}
            {!hideBalance && (
              <EventBalance balance_cents={data?.balance_cents} />
            )}
          </View>
          <Ionicons
            name="chevron-forward-outline"
            size={24}
            color={palette.muted}
          />
        </View>
        {transactions?.data && transactions.data.length >= 1 ? (
          <>
            {transactions.data.map((tx, index) => (
              <Transaction
                transaction={tx}
                orgId={event.id}
                key={tx.id}
                bottom={index == transactions.data.length - 1}
                hideMissingReceipt
              />
            ))}
            {transactions.has_more && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 10,
                }}
              >
                <Text style={{ color: palette.info }}>See more activity</Text>
                <Ionicons
                  name="chevron-forward"
                  color={palette.info}
                  size={18}
                />
              </View>
            )}
          </>
        ) : transactionsIsLoading ? (
          <ActivityIndicator style={{ marginVertical: 20 }} />
        ) : null}
      </View>
    </TouchableHighlight>
  );
}

type Props = NativeStackScreenProps<StackParamList, "Organizations">;

export default function App({ navigation }: Props) {
  const lastErrorTime = useRef<number>(0);
  const ERROR_DEBOUNCE_MS = 5000;
  const [isOnline, setIsOnline] = useState(true);
  const lastFetchTime = useRef<number>(0);
  const FETCH_COOLDOWN_MS = 10000; // Only attempt to fetch every 10 seconds

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const logError = (message: string, error: Error | unknown) => {
    const now = Date.now();
    if (now - lastErrorTime.current > ERROR_DEBOUNCE_MS) {
      console.error(message, error);
      lastErrorTime.current = now;
    }
  };

  const shouldFetch = () => {
    const now = Date.now();
    if (!isOnline) return false;
    if (now - lastFetchTime.current < FETCH_COOLDOWN_MS) return false;
    lastFetchTime.current = now;
    return true;
  };

  const {
    data: organizations,
    error,
    mutate: reloadOrganizations,
  } = useSWR<Organization[]>(isOnline ? "user/organizations" : null, {
    fallbackData: [],
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 2000,
    shouldRetryOnError: false,
    keepPreviousData: true,
    onError: (err) => {
      if (err.name !== "AbortError" && err.name !== "NetworkError") {
        logError("Error fetching organizations:", err);
      }
    },
  });

  const [sortedOrgs, togglePinnedOrg] = usePinnedOrgs(organizations || []);
  const { data: invitations, mutate: reloadInvitations } = useSWR<Invitation[]>(
    isOnline ? "user/invitations" : null,
    {
      fallbackData: [],
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
      shouldRetryOnError: false,
      keepPreviousData: true,
      onError: (err) => {
        if (err.name !== "AbortError" && err.name !== "NetworkError") {
          logError("Error fetching invitations:", err);
        }
      },
    },
  );

  const [refreshing] = useState(false);
  const { fetcher, mutate } = useSWRConfig();
  const tabBarHeight = useBottomTabBarHeight();
  const scheme = useColorScheme();

  useEffect(() => {
    if (!shouldFetch()) return;

    try {
      if (isOnline) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        preload("user", fetcher!);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        preload("user/cards", fetcher!);
        // prefetch all user organization details
        for (const org of organizations || []) {
          preload(`organizations/${org.id}`, fetcher!);
        }
      }
    } catch (err) {
      if (err.name !== "AbortError" && err.name !== "NetworkError") {
        logError("Error preloading data:", err);
      }
    }
  }, [organizations, fetcher, isOnline]);

  const onRefresh = () => {
    if (!shouldFetch()) return;

    try {
      reloadOrganizations();
      reloadInvitations();
      mutate((k) => typeof k === "string" && k.startsWith("organizations"));
    } catch (err) {
      if (err.name !== "AbortError" && err.name !== "NetworkError") {
        logError("Error refreshing data:", err);
      }
    }
  };

  useFocusEffect(() => {
    if (!shouldFetch()) return;

    try {
      reloadOrganizations();
      reloadInvitations();
      mutate((k) => typeof k === "string" && k.startsWith("organizations"));
    } catch (err) {
      if (err.name !== "AbortError" && err.name !== "NetworkError") {
        logError("Error reloading data on focus:", err);
      }
    }
  });

  // Show cached data even if there's an error
  if (error && !organizations?.length) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Ionicons
          name="cloud-offline-outline"
          color={palette.muted}
          size={60}
        />
        <Text style={{ color: palette.muted }}>Offline mode</Text>
        <Text style={{ color: palette.muted, marginTop: 10 }}>
          Using cached data
        </Text>
      </View>
    );
  }

  if (organizations === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (organizations?.length == 0 && invitations?.length == 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="people-outline" color={palette.muted} size={60} />
        <Text style={{ color: palette.muted }}>Nothing here, yet.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, flexGrow: 1 }}
      scrollIndicatorInsets={{ bottom: tabBarHeight }}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: tabBarHeight,
      }}
      contentInsetAdjustmentBehavior="automatic"
      data={sortedOrgs}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={() =>
        invitations &&
        invitations.length > 0 && (
          <View
            style={{
              marginTop: 10,
              marginBottom: 20,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color: palette.muted,
                fontSize: 12,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Pending invitations
            </Text>
            {invitations.map((invitation) => (
              <Event
                key={invitation.id}
                invitation={invitation}
                style={{
                  borderWidth: 2,
                  borderColor:
                    scheme == "dark" ? palette.primary : palette.muted,
                }}
                event={invitation.organization}
                onPress={() =>
                  navigation.navigate("Invitation", {
                    inviteId: invitation.id,
                    invitation,
                  })
                }
                hideBalance
              />
              // <TouchableHighlight key={invitation.id}>
              //   <Text
              //     style={{
              //       color: palette.smoke,
              //       backgroundColor: palette.darkless,
              //       padding: 10,
              //       borderRadius: 10,
              //       overflow: "hidden",
              //     }}
              //   >
              //     {invitation.organization.name}
              //   </Text>
              // </TouchableHighlight>
            ))}
          </View>
        )
      }
      renderItem={({ item: organization }) => (
        <Event
          event={organization}
          showTransactions={organizations.length <= 2 || organization.pinned}
          pinned={organization.pinned}
          onPress={() =>
            navigation.navigate("Event", {
              orgId: organization.id,
              organization,
            })
          }
          onHold={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            togglePinnedOrg(organization.id);
          }}
        />
      )}
      ListFooterComponent={() =>
        organizations.length > 2 && (
          <Text
            style={{
              color: palette.muted,
              textAlign: "center",
              marginTop: 10,
            }}
          >
            Tap and hold to pin an organization
          </Text>
        )
      }
    />
  );
}
