import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showAlert, confirmAction } from "@/lib/alert";
import { useFocusEffect } from "@react-navigation/native";
import { ChevronLeft, UtensilsCrossed } from "lucide-react-native";
import { getRecipeById, deleteRecipe } from "@/features/recipes/api";
import type { Recipe } from "@/features/recipes/types";
import { useSession } from "@/features/auth/session";
import {
  getCollections,
  addRecipeToCollection,
  getRecipeCollections,
  removeRecipeFromCollection,
} from "@/features/collections/api";
import type { Collection, CollectionWithRecipeCount } from "@/features/collections/types";
import {
  getRecipePhotos,
  deleteRecipePhoto,
  getPhotoUrl,
  type RecipePhoto,
} from "@/features/recipes/photos";
import { CommentThread } from "@/features/comments/CommentThread";
import { displayAmount } from "@/features/units/conversions";
import { parseIngredient } from "@/features/units/parser";
import { getUnitPreference } from "@/features/units/api";
import type { UnitSystem } from "@/features/units/types";
import { StarRating } from "@/features/ratings/StarRating";
import { getUserRating, upsertRating } from "@/features/ratings/api";
import type { RatingAggregate } from "@/features/ratings/types";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import {
  accentBlue,
  accentCoral,
  accentWarm,
  accentGreen,
  badgeCoralBg,
  badgeGreenBg,
  badgeYellowBg,
  bgCard,
  bgPage,
  borderDefault,
  borderSubtle,
  fontFamilyBody,
  fontFamilyBodyBold,
  fontFamilyDisplay,
  noPhotoBg,
  fontSizeBase,
  fontSizeLg,
  fontSizeSm,
  fontSizeXs,
  fontSize2xl,
  radiusMd,
  radiusPill,
  radiusSm,
  shadowMd,
  shadowSm,
  textPrimary,
  textSecondary,
  white,
} from "@/lib/tokens";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, isLoading: sessionLoading } = useSession();
  const { breakpoint } = useBreakpoint();
  const insets = useSafeAreaInsets();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [unitPreference, setUnitPreference] = useState<UnitSystem>("imperial");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionWithRecipeCount[]>([]);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [recipeCollections, setRecipeCollections] = useState<Collection[]>([]);
  const [isLoadingCollectionMembership, setIsLoadingCollectionMembership] = useState(false);
  const [photos, setPhotos] = useState<RecipePhoto[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [ratingAggregate, setRatingAggregate] = useState<RatingAggregate>({
    average: null,
    count: 0,
  });

  const isWideLayout = breakpoint === "tablet" || breakpoint === "web";

  async function loadRecipe(showLoading = true) {
    if (!id) return;

    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const data = await getRecipeById(id);
      setRecipe(data);

      if (data) {
        const photoData = await getRecipePhotos(data.id);
        setPhotos(photoData);

        setRatingAggregate({
          average: data.rating_average,
          count: data.rating_count ?? 0,
        });

        if (session?.user) {
          try {
            const userRatingData = await getUserRating(data.id);
            setUserRating(userRatingData?.rating ?? 0);
          } catch {
            setUserRating(0);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load recipe");
    } finally {
      setIsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      // Only show loading spinner on first load — refetch silently to avoid
      // unmounting the entire view (which kills comment state, scroll position, etc.)
      void loadRecipe(!recipe);

      // Also refresh unit preference on focus so changes from profile take effect immediately
      getUnitPreference()
        .then(setUnitPreference)
        .catch(() => {
          // Silent fail — use current/default
        });
    }, [id, session])
  );

  useEffect(() => {
    async function loadCollections() {
      try {
        const data = await getCollections();
        setCollections(data);
      } catch {
        // Silent fail — collection picker is optional
      }
    }

    if (session) {
      void loadCollections();
    }
  }, [session]);

  const isOwner =
    !sessionLoading && recipe != null && session?.user.id === recipe.owner_user_id;
  const recipeCollectionIdSet = new Set(recipeCollections.map((c) => c.id));

  useEffect(() => {
    async function loadMembership() {
      if (!recipe || !isOwner) return;
      setIsLoadingCollectionMembership(true);
      try {
        const data = await getRecipeCollections(recipe.id);
        setRecipeCollections(data);
      } catch {
        // Silent fail
      } finally {
        setIsLoadingCollectionMembership(false);
      }
    }

    void loadMembership();
  }, [recipe?.id, isOwner]);

  async function handleDelete() {
    if (!recipe) return;

    confirmAction(
      "Delete Recipe",
      "Are you sure you want to delete this recipe? This cannot be undone.",
      async () => {
        try {
          await deleteRecipe(recipe.id);
          router.back();
        } catch (e) {
          showAlert(
            "Error",
            e instanceof Error ? e.message : "Failed to delete recipe"
          );
        }
      },
    );
  }

  async function handleRatingChange(newRating: number) {
    if (!recipe || !session?.user) return;
    try {
      await upsertRating(recipe.id, newRating);
      setUserRating(newRating);

      // Refetch aggregates after DB trigger fires
      setTimeout(async () => {
        try {
          const updated = await getRecipeById(recipe.id);
          if (updated) {
            setRatingAggregate({
              average: updated.rating_average,
              count: updated.rating_count ?? 0,
            });
          }
        } catch {
          // Silent fail — aggregates will refresh on next load
        }
      }, 500);
    } catch (e) {
      showAlert("Error", e instanceof Error ? e.message : "Failed to submit rating");
    }
  }

  async function toggleCollectionMembership(collection: CollectionWithRecipeCount) {
    if (!recipe) return;
    const alreadyIn = recipeCollectionIdSet.has(collection.id);
    try {
      if (alreadyIn) {
        await removeRecipeFromCollection(collection.id, recipe.id);
        setRecipeCollections((prev) => prev.filter((c) => c.id !== collection.id));
      } else {
        await addRecipeToCollection(collection.id, recipe.id);
        setRecipeCollections((prev) => [
          ...prev,
          {
            id: collection.id,
            owner_user_id: session!.user.id,
            family_id: collection.family_id,
            name: collection.name,
            description: collection.description ?? null,
            created_at: collection.created_at,
            updated_at: collection.updated_at,
          },
        ]);
      }
    } catch (e) {
      showAlert(
        "Error",
        e instanceof Error ? e.message : "Failed to update collection membership"
      );
    }
  }

  function displayIngredient(ing: Recipe["ingredients"][0]): string {
    if (
      ing.amount !== undefined &&
      ing.unit !== undefined &&
      !ing.is_ambiguous
    ) {
      return displayAmount(
        ing.amount ?? null,
        ing.unit ?? null,
        unitPreference,
        ing.original_text || ing.text
      );
    }
    if (ing.is_ambiguous) {
      return `${ing.text} (approx.)`;
    }
    // Legacy ingredient: no structured amount/unit — try to parse from text
    if (ing.amount === undefined && ing.unit === undefined) {
      const parsed = parseIngredient(ing.text);
      if (parsed.amount !== null && parsed.unit !== null && !parsed.isAmbiguous) {
        return displayAmount(parsed.amount, parsed.unit, unitPreference, ing.text);
      }
    }
    return ing.text;
  }

  function getVisibilityLabel(visibility: string): string {
    if (visibility === "private") return "Private";
    if (visibility === "family") return "Family";
    return "Public";
  }

  function getVisibilityBadgeStyle(visibility: string) {
    if (visibility === "private") {
      return {
        backgroundColor: badgeCoralBg,
        color: accentCoral,
      };
    }
    if (visibility === "family") {
      return {
        backgroundColor: badgeYellowBg,
        color: accentWarm,
      };
    }
    return {
      backgroundColor: badgeGreenBg,
      color: accentGreen,
    };
  }

  function formatMetadata(recipe: Recipe): string {
    const parts: string[] = [];
    if (recipe.prep_time_minutes) parts.push(`Prep ${recipe.prep_time_minutes}m`);
    if (recipe.cook_time_minutes) parts.push(`Cook ${recipe.cook_time_minutes}m`);
    if (recipe.servings) parts.push(`${recipe.servings} servings`);
    return parts.join(" · ");
  }

  // ------------------------------------------------------------------
  // Sub-components (inline for single-file layout)
  // ------------------------------------------------------------------

  function renderHeroImage() {
    if (photos.length > 0) {
      return (
        <Image
          source={{ uri: getPhotoUrl(photos[0].storage_path) }}
          style={{
            width: "100%",
            height: isWideLayout ? 360 : 280,
            resizeMode: "cover",
          }}
        />
      );
    }
    return (
      <View
        style={{
          width: "100%",
          height: 200,
          backgroundColor: noPhotoBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <UtensilsCrossed size={48} color={textSecondary} />
      </View>
    );
  }

  function renderPhotoGallery() {
    if (photos.length <= 1) return null;
    return (
      <FlatList
        horizontal
        data={photos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              width: 80,
              height: 80,
              marginRight: 8,
              borderRadius: radiusSm,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Image
              source={{ uri: getPhotoUrl(item.storage_path) }}
              style={{ width: 80, height: 80 }}
              resizeMode="cover"
            />
            {isOwner && (
              <Pressable
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  borderRadius: 10,
                  width: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={async () => {
                  try {
                    await deleteRecipePhoto(item.id);
                    setPhotos((prev) => prev.filter((p) => p.id !== item.id));
                  } catch {
                    showAlert("Error", "Failed to delete photo");
                  }
                }}
              >
                <Text style={{ color: white, fontSize: 10, lineHeight: 12 }}>✕</Text>
              </Pressable>
            )}
          </View>
        )}
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 12 }}
      />
    );
  }

  function renderIngredientsSection() {
    if (!recipe) return null;
    return (
      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: fontSizeLg,
            fontFamily: fontFamilyDisplay,
            color: textPrimary,
            marginBottom: 12,
          }}
        >
          Ingredients
        </Text>
        {recipe.ingredients.map((ing, i) => (
          <View
            key={i}
            style={{
              paddingVertical: 10,
              borderBottomWidth: i < recipe.ingredients.length - 1 ? 1 : 0,
              borderBottomColor: borderSubtle,
            }}
          >
            <Text
              style={{
                fontSize: fontSizeBase,
                fontFamily: fontFamilyBody,
                color: textPrimary,
                lineHeight: 22,
              }}
            >
              {displayIngredient(ing)}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  function renderStepsSection() {
    if (!recipe) return null;
    return (
      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: fontSizeLg,
            fontFamily: fontFamilyDisplay,
            color: textPrimary,
            marginBottom: 12,
          }}
        >
          Steps
        </Text>
        {recipe.steps.map((step, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              marginBottom: 16,
              gap: 12,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: accentBlue,
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <Text
                style={{
                  color: white,
                  fontSize: fontSizeXs,
                  fontFamily: fontFamilyBodyBold,
                }}
              >
                {i + 1}
              </Text>
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: fontSizeBase,
                fontFamily: fontFamilyBody,
                color: textPrimary,
                lineHeight: 24,
              }}
            >
              {step.text}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  function renderStorySection() {
    if (!recipe?.source_story) return null;
    return (
      <View
        style={{
          marginBottom: 24,
          padding: 16,
          backgroundColor: bgCard,
          borderRadius: radiusMd,
        }}
      >
        <Text
          style={{
            fontSize: fontSizeLg,
            fontFamily: fontFamilyDisplay,
            color: textPrimary,
            marginBottom: 10,
          }}
        >
          The Story Behind This Recipe
        </Text>
        <Text
          style={{
            fontSize: fontSizeBase,
            fontFamily: fontFamilyBody,
            color: textSecondary,
            lineHeight: 24,
            fontStyle: "italic",
          }}
        >
          {recipe.source_story}
        </Text>
      </View>
    );
  }

  function renderRatingsSection() {
    if (!recipe) return null;
    return (
      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: fontSizeLg,
            fontFamily: fontFamilyDisplay,
            color: textPrimary,
            marginBottom: 12,
          }}
        >
          Ratings
        </Text>

        {/* Aggregate display */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <StarRating value={ratingAggregate.average ?? 0} size={20} />
          <Text
            style={{
              fontSize: fontSizeSm,
              fontFamily: fontFamilyBody,
              color: textSecondary,
            }}
          >
            {ratingAggregate.count > 0
              ? `${ratingAggregate.average?.toFixed(1) ?? "0.0"} · ${ratingAggregate.count} ${ratingAggregate.count === 1 ? "rating" : "ratings"}`
              : "No ratings yet"}
          </Text>
        </View>

        {/* Interactive user rating */}
        {session?.user && (
          <View
            style={{
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: borderSubtle,
            }}
          >
            <Text
              style={{
                fontSize: fontSizeSm,
                fontFamily: fontFamilyBodyBold,
                color: textSecondary,
                marginBottom: 8,
              }}
            >
              Your rating
            </Text>
            <StarRating value={userRating} onChange={handleRatingChange} size={32} />
          </View>
        )}
      </View>
    );
  }

  function renderCommentsSection() {
    if (!recipe) return null;
    return (
      <View style={{ marginBottom: 32 }}>
        <Text
          style={{
            fontSize: fontSizeLg,
            fontFamily: fontFamilyDisplay,
            color: textPrimary,
            marginBottom: 12,
          }}
        >
          Comments
        </Text>

        {!sessionLoading && session ? (
          <CommentThread
            recipeId={recipe.id}
            recipeOwnerId={recipe.owner_user_id}
            recipeFamilyId={recipe.family_id}
          />
        ) : !sessionLoading ? (
          <Text
            style={{
              fontSize: fontSizeSm,
              fontFamily: fontFamilyBody,
              color: textSecondary,
              fontStyle: "italic",
              textAlign: "center",
              paddingVertical: 16,
            }}
          >
            Log in to view and post comments.
          </Text>
        ) : null}
      </View>
    );
  }

  function renderCollectionPicker() {
    if (!isOwner || collections.length === 0) return null;
    return (
      <View style={{ marginBottom: 24 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <Pressable
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              backgroundColor: bgCard,
              borderRadius: radiusSm,
              borderWidth: 1,
              borderColor: borderDefault,
            }}
            onPress={() => setShowCollectionPicker(!showCollectionPicker)}
          >
            <Text
              style={{
                fontSize: fontSizeSm,
                fontFamily: fontFamilyBodyBold,
                color: textPrimary,
              }}
            >
              {showCollectionPicker ? "Hide Collections" : "Add to Collection"}
            </Text>
          </Pressable>
          {recipeCollections.length > 0 && (
            <Text
              style={{
                fontSize: fontSizeXs,
                fontFamily: fontFamilyBody,
                color: textSecondary,
              }}
            >
              In: {recipeCollections.map((c) => c.name).sort().join(", ")}
            </Text>
          )}
        </View>

        {showCollectionPicker && (
          <View
            style={{
              backgroundColor: bgPage,
              borderRadius: radiusMd,
              borderWidth: 1,
              borderColor: borderDefault,
              overflow: "hidden",
              ...shadowMd,
            }}
          >
            {isLoadingCollectionMembership && (
              <View style={{ paddingVertical: 12, alignItems: "center" }}>
                <ActivityIndicator />
              </View>
            )}
            {collections.map((collection, idx) => {
              const added = recipeCollectionIdSet.has(collection.id);
              return (
                <View
                  key={collection.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: idx < collections.length - 1 ? 1 : 0,
                    borderBottomColor: borderSubtle,
                  }}
                >
                  <Text
                    style={{
                      fontSize: fontSizeBase,
                      fontFamily: fontFamilyBody,
                      color: textPrimary,
                      flex: 1,
                    }}
                  >
                    {collection.name}
                  </Text>
                  <Pressable
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 14,
                      borderRadius: radiusSm,
                      borderWidth: 1,
                      backgroundColor: added ? bgPage : accentBlue,
                      borderColor: added ? accentCoral : accentBlue,
                    }}
                    onPress={() => toggleCollectionMembership(collection)}
                  >
                    <Text
                      style={{
                        fontSize: fontSizeSm,
                        fontFamily: fontFamilyBodyBold,
                        color: added ? accentCoral : white,
                      }}
                    >
                      {added ? "Remove" : "Add"}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  function renderOwnerActions() {
    if (!isOwner) return null;
    return (
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 32 }}>
        <Pressable
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: bgCard,
            borderRadius: radiusMd,
            borderWidth: 1,
            borderColor: borderDefault,
            alignItems: "center",
          }}
          onPress={() => router.push(`/recipes/${id}/edit`)}
        >
          <Text
            style={{
              fontSize: fontSizeBase,
              fontFamily: fontFamilyBodyBold,
              color: textPrimary,
            }}
          >
            Edit Recipe
          </Text>
        </Pressable>

        <Pressable
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: badgeCoralBg,
            borderRadius: radiusMd,
            borderWidth: 1,
            borderColor: accentCoral,
            alignItems: "center",
          }}
          onPress={handleDelete}
        >
          <Text
            style={{
              fontSize: fontSizeBase,
              fontFamily: fontFamilyBodyBold,
              color: accentCoral,
            }}
          >
            Delete Recipe
          </Text>
        </Pressable>
      </View>
    );
  }

  function renderRecipeContent() {
    if (!recipe) return null;

    const badgeStyle = getVisibilityBadgeStyle(recipe.visibility);
    const metaLine = formatMetadata(recipe);

    return (
      <View style={{ flex: 1 }}>
        {/* Title + metadata block */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: fontSize2xl,
              fontFamily: fontFamilyDisplay,
              color: textPrimary,
              marginBottom: 8,
              lineHeight: 32,
            }}
          >
            {recipe.title}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <View
              style={{
                paddingVertical: 3,
                paddingHorizontal: 10,
                borderRadius: radiusPill,
                backgroundColor: badgeStyle.backgroundColor,
              }}
            >
              <Text
                style={{
                  fontSize: fontSizeXs,
                  fontFamily: fontFamilyBodyBold,
                  color: badgeStyle.color,
                }}
              >
                {getVisibilityLabel(recipe.visibility)}
              </Text>
            </View>

            {metaLine.length > 0 && (
              <Text
                style={{
                  fontSize: fontSizeSm,
                  fontFamily: fontFamilyBody,
                  color: textSecondary,
                }}
              >
                {metaLine}
              </Text>
            )}
          </View>

          {recipe.description && (
            <Text
              style={{
                fontSize: fontSizeBase,
                fontFamily: fontFamilyBody,
                color: textSecondary,
                lineHeight: 24,
                marginTop: 8,
              }}
            >
              {recipe.description}
            </Text>
          )}

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 10,
              }}
            >
              {recipe.tags.map((tag, i) => (
                <View
                  key={i}
                  style={{
                    paddingVertical: 3,
                    paddingHorizontal: 10,
                    borderRadius: radiusPill,
                    backgroundColor: bgCard,
                    borderWidth: 1,
                    borderColor: borderDefault,
                  }}
                >
                  <Text
                    style={{
                      fontSize: fontSizeXs,
                      fontFamily: fontFamilyBody,
                      color: textSecondary,
                    }}
                  >
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {renderIngredientsSection()}
        {renderStepsSection()}
        {renderStorySection()}
        {renderRatingsSection()}
        {renderCollectionPicker()}
        {renderCommentsSection()}
        {renderOwnerActions()}
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------------

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bgPage,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={accentBlue} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bgPage,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text
          style={{
            fontSize: fontSizeBase,
            fontFamily: fontFamilyBody,
            color: textSecondary,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          {error}
        </Text>
        <Pressable
          style={{
            paddingVertical: 10,
            paddingHorizontal: 24,
            backgroundColor: accentBlue,
            borderRadius: radiusMd,
          }}
          onPress={() => void loadRecipe()}
        >
          <Text
            style={{
              fontSize: fontSizeBase,
              fontFamily: fontFamilyBodyBold,
              color: white,
            }}
          >
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bgPage,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text
          style={{
            fontSize: fontSizeBase,
            fontFamily: fontFamilyBody,
            color: textSecondary,
            textAlign: "center",
          }}
        >
          Recipe not found or you don't have access.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bgPage }}>
      {/* Sticky action header — outside ScrollView */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: borderDefault,
          backgroundColor: bgPage,
          ...shadowSm,
        }}
      >
        {/* Left: Back button */}
        <Pressable
          onPress={() => router.back()}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            padding: 4,
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color={textPrimary} />
        </Pressable>

        {/* Right: action buttons */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isOwner && (
            <Pressable
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: radiusMd,
                borderWidth: 1,
                borderColor: borderDefault,
                backgroundColor: bgPage,
              }}
              onPress={() => router.push(`/recipes/${id}/edit`)}
            >
              <Text
                style={{
                  fontSize: fontSizeSm,
                  fontFamily: fontFamilyBodyBold,
                  color: textPrimary,
                }}
              >
                Edit
              </Text>
            </Pressable>
          )}

          <Pressable
            style={{
              paddingVertical: 8,
              paddingHorizontal: 18,
              borderRadius: radiusMd,
              backgroundColor: accentBlue,
            }}
            onPress={() => router.push(`/recipes/${id}/cook`)}
          >
            <Text
              style={{
                fontSize: fontSizeSm,
                fontFamily: fontFamilyBodyBold,
                color: white,
              }}
            >
              Start Cooking
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {isWideLayout ? (
          /* Tablet / Web: two-column layout */
          <View
            style={{
              flexDirection: "row",
              gap: 32,
              padding: 32,
              alignItems: "flex-start",
            }}
          >
            {/* Left column: hero image + gallery */}
            <View style={{ flex: 1 }}>
              <View
                style={{
                  borderRadius: radiusMd,
                  overflow: "hidden",
                  backgroundColor: noPhotoBg,
                }}
              >
                {renderHeroImage()}
              </View>
              {renderPhotoGallery()}
            </View>

            {/* Right column: all recipe content */}
            <View style={{ flex: 1 }}>{renderRecipeContent()}</View>
          </View>
        ) : (
          /* Mobile: single column */
          <View>
            {/* Hero image — full width, no radius on mobile */}
            <View style={{ backgroundColor: noPhotoBg }}>
              {renderHeroImage()}
            </View>
            {renderPhotoGallery() && (
              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                {renderPhotoGallery()}
              </View>
            )}

            {/* Recipe content */}
            <View style={{ padding: 16 }}>{renderRecipeContent()}</View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
