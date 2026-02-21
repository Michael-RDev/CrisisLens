import lightgbm as lgb


def build_model():
    return lgb.LGBMRegressor(
        n_estimators=400,
        learning_rate=0.04,
        max_depth=5,
        num_leaves=24,
        subsample=0.80,
        colsample_bytree=0.80,
        reg_alpha=0.1,
        reg_lambda=0.1,
        random_state=42,
        verbose=-1,
    )
