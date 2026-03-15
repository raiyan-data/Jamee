import React, { useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  ViewToken,
  ActivityIndicator,
} from "react-native";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useReels } from "@/hooks/usePosts";
import type { Reel } from "@/types/models";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ReelScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { data: reels, isLoading } = useReels();

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleLike = useCallback((reelId: string) => {
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Reel; index: number }) => (
      <VideoPlayer
        reel={item}
        isActive={index === activeIndex}
        onLike={handleLike}
        testID={`reel-${item.id}`}
      />
    ),
    [activeIndex, handleLike]
  );

  if (isLoading || !reels) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reels}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
