from sklearn.ensemble import RandomForestRegressor


def build_model():
    return RandomForestRegressor(
        n_estimators=300,
        max_depth=6,
        min_samples_leaf=2,
        max_features=0.7,
        random_state=42,
        n_jobs=-1,
    )
