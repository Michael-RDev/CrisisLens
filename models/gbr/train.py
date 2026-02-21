from sklearn.ensemble import GradientBoostingRegressor


def build_model():
    return GradientBoostingRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=4,
        subsample=0.80,
        random_state=42,
    )
