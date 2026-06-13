using TrueSpend.Api.Mappers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Cards;

public sealed class CategoryIconMapTests
{
    // Regression: the static map is built with a case-insensitive comparer, so "Dining"/"dining"
    // collided and the static initializer threw a duplicate-key exception, taking down card detail.
    [Fact]
    public void Resolve_does_not_throw_and_maps_known_groups()
    {
        Assert.Equal("utensils", CategoryIconMap.Resolve("Dining"));
        Assert.Equal("plane", CategoryIconMap.Resolve("Travel"));
    }

    [Theory]
    [InlineData("dining")]
    [InlineData("DINING")]
    [InlineData("Dining")]
    public void Resolve_is_case_insensitive(string key) =>
        Assert.Equal("utensils", CategoryIconMap.Resolve(key));

    [Theory]
    [InlineData("electronics", "tv")]
    [InlineData("groceries", "shopping-cart")]
    public void Resolve_maps_legacy_seed_codes(string key, string expected) =>
        Assert.Equal(expected, CategoryIconMap.Resolve(key));

    [Theory]
    [InlineData(null)]
    [InlineData("not-a-category")]
    public void Resolve_falls_back_to_tag_for_unknown(string? key) =>
        Assert.Equal("tag", CategoryIconMap.Resolve(key));
}
