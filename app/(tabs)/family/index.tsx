import { Link, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

import { showAlert } from "@/lib/alert";
import { useSession } from "@/features/auth/session";
import { PageContainer } from "@/components/nav/PageContainer";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { supabase } from "@/lib/supabase";
import {
  accentBlue,
  bgCard,
  bgPage,
  borderDefault,
  fontFamilyBody,
  fontFamilyBodyBold,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  fontSize2xl,
  fontSizeBase,
  fontSizeSm,
  radiusMd,
  shadowSm,
  textPrimary,
  textSecondary,
  white,
} from "@/lib/tokens";

type Family = {
  id: string;
  name: string;
  member_count?: number;
};

export default function FamiliesHomeScreen() {
  const { session, isLoading } = useSession();
  const userId = session?.user.id ?? null;
  const { breakpoint } = useBreakpoint();

  const [families, setFamilies] = useState<Family[]>([]);
  const [familyName, setFamilyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const isAuthed = useMemo(() => Boolean(userId), [userId]);
  const isMobile = breakpoint === "mobile";

  async function refresh() {
    if (!isAuthed) return;
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("families")
        .select("id,name")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFamilies((data ?? []) as Family[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load families";
      showAlert("Error", msg);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (!isLoading && isAuthed) {
      void refresh();
    }
  }, [isLoading, isAuthed]);

  async function onCreateFamily() {
    const name = familyName.trim();
    if (!name) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("create_family", {
        p_name: name,
      });
      if (error) throw error;
      setFamilyName("");
      setShowCreate(false);
      const familyId = data as string;
      router.push(`/family/${familyId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create family";
      showAlert("Create family failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color={accentBlue} />
        </View>
      </PageContainer>
    );
  }

  if (!isAuthed) {
    return (
      <PageContainer>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyDisplay,
              fontSize: fontSize2xl,
              color: textPrimary,
            }}
          >
            Family
          </Text>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textSecondary,
              textAlign: "center",
            }}
          >
            Please log in to create or join a family.
          </Text>
          <Link
            href="/(auth)/login"
            style={{
              fontFamily: fontFamilyBodyMedium,
              fontSize: fontSizeBase,
              color: accentBlue,
            }}
          >
            Log in
          </Link>
        </View>
      </PageContainer>
    );
  }

  function renderFamilyCard({ item }: { item: Family }) {
    return (
      <Pressable
        onPress={() => router.push(`/family/${item.id}`)}
        style={({ pressed }) => ({
          backgroundColor: bgCard,
          borderRadius: radiusMd,
          padding: 16,
          ...shadowSm,
          opacity: pressed ? 0.85 : 1,
          ...(isMobile
            ? { width: "100%" as const }
            : { maxWidth: 400, minWidth: 280, flexGrow: 1, flexBasis: 0 }),
        })}
      >
        <Text
          style={{
            fontFamily: fontFamilyBodyBold,
            fontSize: fontSizeBase,
            color: textPrimary,
          }}
        >
          {item.name}
        </Text>
        {item.member_count != null && (
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeSm,
              color: textSecondary,
              marginTop: 4,
            }}
          >
            {item.member_count}{" "}
            {item.member_count === 1 ? "member" : "members"}
          </Text>
        )}
      </Pressable>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Text
          style={{
            fontFamily: fontFamilyDisplay,
            fontSize: fontSize2xl,
            color: textPrimary,
          }}
        >
          Family
        </Text>
        <Pressable
          onPress={() => setShowCreate(!showCreate)}
          style={({ pressed }) => ({
            backgroundColor: accentBlue,
            borderRadius: radiusMd,
            paddingVertical: 10,
            paddingHorizontal: 20,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: fontFamilyBodyMedium,
              fontSize: fontSizeSm,
              color: white,
            }}
          >
            Create Family
          </Text>
        </Pressable>
      </View>

      {/* Create Family Form (collapsible) */}
      {showCreate && (
        <View
          style={{
            backgroundColor: bgCard,
            borderRadius: radiusMd,
            padding: 16,
            marginBottom: 16,
            gap: 12,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBodyBold,
              fontSize: fontSizeBase,
              color: textPrimary,
            }}
          >
            Create a new family
          </Text>
          <TextInput
            placeholder="Family name"
            value={familyName}
            onChangeText={setFamilyName}
            style={{
              borderWidth: 1,
              borderColor: borderDefault,
              borderRadius: radiusMd,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: fontSizeBase,
              fontFamily: fontFamilyBody,
              color: textPrimary,
              backgroundColor: bgPage,
            }}
          />
          <Pressable
            onPress={onCreateFamily}
            disabled={isSubmitting || !familyName.trim()}
            style={({ pressed }) => ({
              backgroundColor: accentBlue,
              borderRadius: radiusMd,
              paddingVertical: 12,
              alignItems: "center" as const,
              opacity: pressed || isSubmitting ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: fontSizeBase,
                color: white,
              }}
            >
              {isSubmitting ? "Creating..." : "Create"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Family List */}
      {families.length === 0 && !isRefreshing ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            paddingTop: 60,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textSecondary,
              textAlign: "center",
            }}
          >
            No families yet
          </Text>
          <Pressable
            onPress={() => setShowCreate(true)}
            style={({ pressed }) => ({
              backgroundColor: accentBlue,
              borderRadius: radiusMd,
              paddingVertical: 10,
              paddingHorizontal: 20,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: fontSizeSm,
                color: white,
              }}
            >
              Create Family
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={families}
          keyExtractor={(item) => item.id}
          renderItem={renderFamilyCard}
          numColumns={isMobile ? 1 : 2}
          key={isMobile ? "single" : "double"}
          columnWrapperStyle={
            !isMobile ? { gap: 16 } : undefined
          }
          contentContainerStyle={{
            gap: 16,
            paddingBottom: 24,
            ...(isMobile
              ? {}
              : { flexGrow: 1, flexBasis: 0 }),
          }}
          refreshControl={
            Platform.OS !== 'web'
              ? <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
              : undefined
          }
        />
      )}
    </PageContainer>
  );
}
